/**
 * getMilkBill — full 8-step Oracle bill fetch service.
 *
 * Tables used (all real production tables, not our generic T.* aliases):
 *   FA_DCSBILL_T           — bill header
 *   FA_DCSBILLDETAILS_T    — per-shift milk entries
 *   FA_DEDUCTION_T         — standard deductions
 *   FA_CIDEDUCTION_T       — other deductions (cattlefeed, ghee, etc.)
 *   FA_DCSWISEDEDHEADWISE_TEMP — outstanding deductions from previous cycle
 *   FA_PRICEDIFFPERIODICAL_T   — price difference
 *   CI_PAYMENTADVICE_T     — payment advice / additional payments
 *   PI_DCS_M               — DCS master
 *   PI_DCSBANK_T           — DCS bank info
 *   FA_BANK_M              — bank master
 *   CI_SERVICE_M           — service master
 *   CI_DEDUCTIONHEAD_M     — deduction head master
 */

import { query, queryOne } from "../lib/oracle";

// ─── Input / Output types ────────────────────────────────────────────────────

export interface MilkBillInput {
  fromDate: string;     // YYYY-MM-DD  (current billing period)
  toDate: string;       // YYYY-MM-DD
  dcsCode: string;      // e.g. "8014"
  prevFromDate?: string; // YYYY-MM-DD  (previous billing period — for outstanding / price-diff)
  prevToDate?: string;   // YYYY-MM-DD
}

export interface BillHeader {
  billId: number;
  dcsDisplayCode: string;
  dcsName: string;
  billDate: string;
  billNo: string | null;
  rateDisplayOnBill: number;
  billAmount: number;
  bankName: string;
  accountNo: string;
}

export interface BillEntry {
  milkDate: string;
  shift: "M" | "E";   // 0 → M (Morning), 1 → E (Evening)
  quality: string;
  quantity: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
}

export interface StandardDeduction {
  name: string;
  amount: number;
}

export interface OtherDeduction {
  name: string;
  amount: number;
}

export interface OutstandingDeduction {
  fromDate: string;
  toDate: string;
  name: string;
  amount: number;
}

export interface AdditionalPayment {
  serviceName: string;
  amount: number;
}

export interface PaymentAdvice {
  paymentAdviceDate: string;
  amount: number;
}

export interface MilkBillResult {
  header: BillHeader;
  entries: BillEntry[];
  totals: {
    quantity: number;
    amount: number;
  };
  payments: {
    milkCost: number;
    headload: number;
    paymentAdvices: PaymentAdvice[];
    additional: AdditionalPayment[];
  };
  deductions: {
    standard: StandardDeduction[];
    other: OtherDeduction[];
    outstanding: OutstandingDeduction[];
    totalDeductions: number;
  };
  priceDiff: number;
  netPayable: number;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmtDate(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const s = String(d);
  // Oracle may return DD-MON-YY or ISO-like string — normalise to YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  return s;
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ─── Main service ────────────────────────────────────────────────────────────

export async function getMilkBill(input: MilkBillInput): Promise<MilkBillResult> {
  const { fromDate, toDate, dcsCode, prevFromDate, prevToDate } = input;

  // ── STEP 1: Bill Header ─────────────────────────────────────────────────
  type HeaderRow = {
    BILLID: number;
    DCSDISPLAYCODE: string;
    DCSNAME: string;
    BILLDATE: unknown;
    BILLNO: string | null;
    RATEDISPLAYONBILL: number;
    BILLAMOUNT: number;
    BANKNAME: string;
    ACCOUNTNO: string;
  };

  const headerRow = await queryOne<HeaderRow>(
    `SELECT
       B.BILLID,
       D.DCSDISPLAYCODE,
       D.DCSNAME,
       B.BILLDATE,
       B.BILLNO,
       B.RATEDISPLAYONBILL,
       B.BILLAMOUNT,
       F.BANKNAME,
       T.ACCOUNTNO
     FROM FA_DCSBILL_T B
     INNER JOIN PI_DCS_M D ON D.DCSCODE = B.DCSCODE
     INNER JOIN PI_DCSBANK_T T ON T.DCSCODE = D.DCSCODE
     INNER JOIN FA_BANK_M F ON T.BANKID = F.BANKID
     WHERE B.BILLFROMDATE = TO_DATE(:fromDate, 'YYYY-MM-DD')
       AND B.BILLTILLDATE = TO_DATE(:toDate, 'YYYY-MM-DD')
       AND T.BANKUSAGEID = 'Z011'
       AND D.DCSDISPLAYCODE = :dcsCode`,
    { fromDate, toDate, dcsCode }
  );

  if (!headerRow) {
    throw Object.assign(new Error("No bill found for the given parameters"), { statusCode: 404 });
  }

  const billId = num(headerRow.BILLID);

  const header: BillHeader = {
    billId,
    dcsDisplayCode: headerRow.DCSDISPLAYCODE,
    dcsName: headerRow.DCSNAME,
    billDate: fmtDate(headerRow.BILLDATE),
    billNo: headerRow.BILLNO ?? null,
    rateDisplayOnBill: num(headerRow.RATEDISPLAYONBILL),
    billAmount: num(headerRow.BILLAMOUNT),
    bankName: headerRow.BANKNAME,
    accountNo: headerRow.ACCOUNTNO,
  };

  // ── STEP 2: Bill Details (milk entries) ─────────────────────────────────
  type DetailRow = {
    MILKDATE: unknown;
    SHIFT: number;
    QUALITY: string;
    QUANTITY: number;
    FAT: number;
    SNF: number;
    RATE: number;
    AMOUNT: number;
  };

  const detailRows = await query<DetailRow>(
    `SELECT
       MILKDATE,
       SHIFT,
       QUALITY,
       QUANTITY,
       FATPERCENTAGE  AS FAT,
       SNFPERCENTAGE  AS SNF,
       CALCULATEDRATE AS RATE,
       CALCULATEDAMOUNT AS AMOUNT
     FROM FA_DCSBILLDETAILS_T
     WHERE BILLID = :billId
     ORDER BY MILKDATE`,
    { billId }
  );

  const entries: BillEntry[] = detailRows.map((r) => ({
    milkDate: fmtDate(r.MILKDATE),
    shift: num(r.SHIFT) === 1 ? "E" : "M",
    quality: r.QUALITY ?? "",
    quantity: num(r.QUANTITY),
    fat: num(r.FAT),
    snf: num(r.SNF),
    rate: num(r.RATE),
    amount: num(r.AMOUNT),
  }));

  // ── STEP 3: Totals ──────────────────────────────────────────────────────
  const totalQuantity = entries.reduce((s, e) => s + e.quantity, 0);
  const totalAmount   = entries.reduce((s, e) => s + e.amount,   0);

  // ── STEP 4: Payments ────────────────────────────────────────────────────
  type SumRow = { S: number | null };

  const [milkCostRow, headloadRow, paymentAdviceRows, additionalRows] = await Promise.all([
    // Milk cost
    queryOne<SumRow>(
      `SELECT SUM(CALCULATEDAMOUNT) AS S FROM FA_DCSBILLDETAILS_T WHERE BILLID = :billId`,
      { billId }
    ),
    // Headload
    queryOne<SumRow>(
      `SELECT SUM(HEADLOADAMOUNT) AS S FROM FA_DCSBILLDETAILS_T WHERE BILLID = :billId`,
      { billId }
    ),
    // Payment advice
    query<{ PAYMENTADVICEDATE: unknown; PAYMENTADVICEAMOUNT: number }>(
      `SELECT T.PAYMENTADVICEDATE, T.PAYMENTADVICEAMOUNT
       FROM CI_PAYMENTADVICE_T T
       INNER JOIN PI_DCS_M D ON D.DCSCODE = T.DCSID
       WHERE D.DCSDISPLAYCODE = :dcsCode
         AND T.PAYMENTADVICEDATE BETWEEN TO_DATE(:fromDate,'YYYY-MM-DD') AND TO_DATE(:toDate,'YYYY-MM-DD')`,
      { dcsCode, fromDate, toDate }
    ),
    // Additional payments (Step 7)
    query<{ SERVICENAME: string; PAYMENTADVICEAMOUNT: number }>(
      `SELECT M.SERVICENAME, T.PAYMENTADVICEAMOUNT
       FROM CI_PAYMENTADVICE_T T
       INNER JOIN PI_DCS_M D ON D.DCSCODE = T.DCSID
       INNER JOIN CI_SERVICE_M M ON T.SERVICEID = M.SERVICEID
       WHERE D.DCSDISPLAYCODE = :dcsCode
         AND T.PAYMENTADVICEDATE BETWEEN TO_DATE(:fromDate,'YYYY-MM-DD') AND TO_DATE(:toDate,'YYYY-MM-DD')
       ORDER BY T.CREATIONDATE`,
      { dcsCode, fromDate, toDate }
    ),
  ]);

  const milkCost  = num(milkCostRow?.S);
  const headload  = num(headloadRow?.S);
  const paymentAdvices: PaymentAdvice[] = paymentAdviceRows.map((r) => ({
    paymentAdviceDate: fmtDate(r.PAYMENTADVICEDATE),
    amount: num(r.PAYMENTADVICEAMOUNT),
  }));
  const additional: AdditionalPayment[] = additionalRows.map((r) => ({
    serviceName: r.SERVICENAME ?? "",
    amount: num(r.PAYMENTADVICEAMOUNT),
  }));
  const additionalTotal = additional.reduce((s, a) => s + a.amount, 0);

  // ── STEP 5: Deductions ──────────────────────────────────────────────────
  const [standardRows, otherRows, outstandingRows] = await Promise.all([
    // Standard deductions
    query<{ DEDUCTIONTRANSNAME: string; DEDUCTIONTRANSAMT: number }>(
      `SELECT T.DEDUCTIONTRANSNAME, T.DEDUCTIONTRANSAMT
       FROM FA_DEDUCTION_T T
       INNER JOIN PI_DCS_M D ON D.DCSCODE = T.DCSCODE
       WHERE T.DEDFROMDATE = TO_DATE(:fromDate,'YYYY-MM-DD')
         AND T.DEDTODATE   = TO_DATE(:toDate,'YYYY-MM-DD')
         AND D.DCSDISPLAYCODE = :dcsCode`,
      { fromDate, toDate, dcsCode }
    ),
    // Other deductions (cattlefeed, ghee, etc.)
    query<{ AMOUNT: number; DEDUCTIONHEADNAME: string }>(
      `SELECT T.AMOUNT, M.DEDUCTIONHEADNAME
       FROM FA_CIDEDUCTION_T T
       INNER JOIN PI_DCS_M D ON D.DCSCODE = T.DCSCODE
       INNER JOIN CI_DEDUCTIONHEAD_M M ON T.DEDUCTIONHEADID = M.DEDUCTIONHEADID
       WHERE T.BILLFROMDATE = TO_DATE(:fromDate,'YYYY-MM-DD')
         AND T.BILLTILLDATE = TO_DATE(:toDate,'YYYY-MM-DD')
         AND D.DCSDISPLAYCODE = :dcsCode
       ORDER BY T.BILLFROMDATE`,
      { fromDate, toDate, dcsCode }
    ),
    // Outstanding deductions from previous cycle
    prevFromDate && prevToDate
      ? query<{ BILLFROMDATE: unknown; BILLTILLDATE: unknown; DEDUCTIONHEADNAME: string; DEDUCTEDAMOUNT: number }>(
          `SELECT T.BILLFROMDATE, T.BILLTILLDATE, T.DEDUCTIONHEADNAME, T.DEDUCTEDAMOUNT
           FROM FA_DCSWISEDEDHEADWISE_TEMP T
           INNER JOIN PI_DCS_M M ON M.DCSCODE = T.DCSID
           WHERE T.BILLFROMDATE = TO_DATE(:prevFromDate,'YYYY-MM-DD')
             AND T.BILLTILLDATE = TO_DATE(:prevToDate,'YYYY-MM-DD')
             AND M.DCSDISPLAYCODE = :dcsCode`,
          { prevFromDate, prevToDate, dcsCode }
        )
      : Promise.resolve([]),
  ]);

  const standard: StandardDeduction[] = standardRows.map((r) => ({
    name: r.DEDUCTIONTRANSNAME ?? "",
    amount: num(r.DEDUCTIONTRANSAMT),
  }));
  const other: OtherDeduction[] = otherRows.map((r) => ({
    name: r.DEDUCTIONHEADNAME ?? "",
    amount: num(r.AMOUNT),
  }));
  const outstanding: OutstandingDeduction[] = (outstandingRows as {
    BILLFROMDATE: unknown; BILLTILLDATE: unknown; DEDUCTIONHEADNAME: string; DEDUCTEDAMOUNT: number;
  }[]).map((r) => ({
    fromDate: fmtDate(r.BILLFROMDATE),
    toDate: fmtDate(r.BILLTILLDATE),
    name: r.DEDUCTIONHEADNAME ?? "",
    amount: num(r.DEDUCTEDAMOUNT),
  }));

  const totalDeductions =
    standard.reduce((s, d) => s + d.amount, 0) +
    other.reduce((s, d) => s + d.amount, 0) +
    outstanding.reduce((s, d) => s + d.amount, 0);

  // ── STEP 6: Price Difference ────────────────────────────────────────────
  let priceDiff = 0;
  if (prevFromDate && prevToDate) {
    const priceDiffRow = await queryOne<{ PRICEDIFFPERIODICALAMT: number }>(
      `SELECT PRICEDIFFPERIODICALAMT
       FROM FA_PRICEDIFFPERIODICAL_T T
       INNER JOIN PI_DCS_M D ON D.DCSCODE = T.DCSCODE
       WHERE D.DCSDISPLAYCODE = :dcsCode
         AND T.MILKFROMDATE = TO_DATE(:prevFromDate,'YYYY-MM-DD')
         AND T.MILKTODATE   = TO_DATE(:prevToDate,'YYYY-MM-DD')`,
      { dcsCode, prevFromDate, prevToDate }
    );
    priceDiff = num(priceDiffRow?.PRICEDIFFPERIODICALAMT);
  }

  // ── STEP 8: Net Payable ─────────────────────────────────────────────────
  // The bill header already carries the final payable amount from Oracle.
  // Keep the component breakdowns for display, but use the header amount
  // as the authoritative net payable to avoid double-counting price diff.
  const netPayable = header.billAmount;

  return {
    header,
    entries,
    totals: { quantity: totalQuantity, amount: totalAmount },
    payments: { milkCost, headload, paymentAdvices, additional },
    deductions: { standard, other, outstanding, totalDeductions },
    priceDiff,
    netPayable,
  };
}
