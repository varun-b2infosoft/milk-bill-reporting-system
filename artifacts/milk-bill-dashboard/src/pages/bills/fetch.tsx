import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, ChevronUp, Printer, AlertCircle } from "lucide-react";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatBillDate(value: string): string {
  if (!value) return "-";

  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12) {
      return `${String(day).padStart(2, "0")}-${MONTHS[month - 1]}-${year}`;
    }
  }

  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  }

  return normalized;
}

function fixed2(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function formatRateDisplay(value: number | string | null | undefined): string {
  if (value == null) return "-";
  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value.toFixed(2)}` : "-";
  }

  const trimmed = value.trim();
  if (!trimmed) return "-";

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return numeric.toFixed(2);
  }

  return trimmed;
}

// ─── Convert number to words ──────────────────────────────────────────────────
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const scales = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numberToWords(-num);

  let parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    let groupValue = num % 1000;

    if (groupValue > 0) {
      let groupWords = "";

      // Hundreds
      let hundreds = Math.floor(groupValue / 100);
      if (hundreds > 0) {
        groupWords = ones[hundreds] + " Hundred";
      }

      // Tens and ones
      let remainder = groupValue % 100;
      if (remainder >= 20) {
        let ten = Math.floor(remainder / 10);
        let one = remainder % 10;
        if (groupWords) groupWords += " ";
        groupWords += tens[ten];
        if (one > 0) groupWords += " " + ones[one];
      } else if (remainder >= 10) {
        if (groupWords) groupWords += " ";
        groupWords += teens[remainder - 10];
      } else if (remainder > 0) {
        if (groupWords) groupWords += " ";
        groupWords += ones[remainder];
      }

      if (scaleIndex > 0) {
        groupWords += " " + scales[scaleIndex];
      }
      parts.unshift(groupWords);
    }

    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return parts.join(" ");
}

// ─── Types (mirrors backend MilkBillResult) ──────────────────────────────────

interface BillHeader {
  billId: number;
  dcsDisplayCode: string;
  dcsName: string;
  billDate: string;
  billNo: string | null;
  rateDisplayOnBill: number | string;
  billAmount: number;
  bankName: string;
  accountNo: string;
}

interface BillEntry {
  milkDate: string;
  shift: "M" | "E";
  quality: string;
  quantity: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
}

interface MilkBillResult {
  header: BillHeader;
  entries: BillEntry[];
  totals: { quantity: number; amount: number };
  payments: {
    milkCost: number;
    headload: number;
    paymentAdvices: { paymentAdviceDate: string; amount: number }[];
    additional: { serviceName: string; amount: number }[];
  };
  deductions: {
    standard: { name: string; amount: number }[];
    other: { name: string; amount: number }[];
    outstanding: { fromDate: string; toDate: string; name: string; amount: number }[];
    totalDeductions: number;
  };
  priceDiff: number;
  netPayable: number;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

function apiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:8080/api";
}

async function fetchMilkBill(params: {
  fromDate: string;
  toDate: string;
  dcsCode: string;
  prevFromDate?: string;
  prevToDate?: string;
}): Promise<MilkBillResult> {
  const qs = new URLSearchParams();
  qs.set("fromDate", params.fromDate);
  qs.set("toDate", params.toDate);
  qs.set("dcsCode", params.dcsCode);
  if (params.prevFromDate) qs.set("prevFromDate", params.prevFromDate);
  if (params.prevToDate) qs.set("prevToDate", params.prevToDate);

  const res = await fetch(`${apiBase()}/milk-bill?${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FetchBill() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dcsCode, setDcsCode] = useState("");

  const prevFromDate = fromDate;
  const prevToDate = toDate;

  const [bill, setBill] = useState<MilkBillResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deductionsOpen, setDeductionsOpen] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !dcsCode.trim()) return;

    const effectivePrevFromDate = prevFromDate;
    const effectivePrevToDate = prevToDate;

    setLoading(true);
    setError(null);
    setBill(null);

    try {
      // Log the dates being sent
      console.log("Search Parameters:", {
        fromDate,
        toDate,
        dcsCode: dcsCode.trim(),
        prevFromDate: effectivePrevFromDate,
        prevToDate: effectivePrevToDate,
      });

      const result = await fetchMilkBill({
        fromDate,
        toDate,
        dcsCode: dcsCode.trim(),
        prevFromDate: effectivePrevFromDate || undefined,
        prevToDate: effectivePrevToDate || undefined,
      });

      console.log("Fetched bill result:", result);

      // Validate result
      if (!result || !result.header) {
        throw new Error("Invalid response: Missing bill header data");
      }

      setBill(result);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      const errorMsg =
        (err as Error).message ?? "Failed to fetch bill. Please check the parameters.";
      console.error("Bill fetch error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Group entries by date for display
  console.log("Bill entries:", bill?.entries);

  const additionalTotal = (bill?.payments.additional ?? []).reduce((s, a) => s + a.amount, 0);

  const qualitySummary = React.useMemo(() => {
    const summary: Record<string, { quantity: number; amount: number }> = {};
    if (!bill) return summary;

    bill.entries.forEach((entry) => {
      const key = (entry.quality || "").trim().toUpperCase() || "UNKNOWN";
      if (!summary[key]) {
        summary[key] = { quantity: 0, amount: 0 };
      }
      summary[key].quantity += entry.quantity;
      summary[key].amount += entry.amount;
    });

    return summary;
  }, [bill]);

  const printDeductions = bill
    ? [...bill.deductions.standard, ...bill.deductions.other].filter((row) => row.amount !== 0)
    : [];

  const totalPayment = bill ? bill.payments.milkCost + bill.payments.headload + additionalTotal : 0;

  const sweetSummary = qualitySummary.SWEET ?? { quantity: 0, amount: 0 };
  const sourSummary = qualitySummary.SOUR ?? { quantity: 0, amount: 0 };
  const curdSummary = qualitySummary.CURD ?? { quantity: 0, amount: 0 };

  return (
    <div className="space-y-4 pb-32 print:pb-0">
      <style>
        {`@media print {
          @page { size: A4 portrait; margin: 10mm; }
        }`}
      </style>
      <div className="print:hidden">
        {/* Page heading */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fetch Milk Bill</h2>
          <p className="text-sm text-muted-foreground">
            Query bill data directly from the Oracle database by date range and DCS code.
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    DCS Code
                  </label>
                  <Input
                    placeholder="e.g. 8014"
                    value={dcsCode}
                    onChange={(e) => setDcsCode(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Prev From Date
                  </label>
                  <Input type="date" value={prevFromDate} readOnly className="h-9" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Prev To Date
                  </label>
                  <Input type="date" value={prevToDate} readOnly className="h-9" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={loading || !fromDate || !toDate || !dcsCode.trim()}
                  className="bg-primary text-white hover:bg-primary/90 gap-2"
                >
                  <Search className="w-4 h-4" />
                  {loading ? "Fetching..." : "Fetch Bill"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setDcsCode("");
                    setBill(null);
                    setError(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Could not fetch bill</p>
              <p className="text-sm mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Debug Info - Show parameters being sent */}
        {!loading && !bill && (fromDate || toDate || dcsCode) && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-xs font-mono text-blue-900">
              {(() => {
                const effectivePrevFromDate = prevFromDate;
                const effectivePrevToDate = prevToDate;

                return (
                  <>
                    <p className="font-bold mb-2">Query Parameters:</p>
                    <p>
                      DCS Code: <span className="font-semibold">{dcsCode || "(empty)"}</span>
                    </p>
                    <p>
                      From Date: <span className="font-semibold">{fromDate || "(empty)"}</span>
                    </p>
                    <p>
                      To Date: <span className="font-semibold">{toDate || "(empty)"}</span>
                    </p>
                    <p>
                      Prev From Date:{" "}
                      <span className="font-semibold">{effectivePrevFromDate || "(empty)"}</span>
                    </p>
                    <p>
                      Prev To Date:{" "}
                      <span className="font-semibold">{effectivePrevToDate || "(empty)"}</span>
                    </p>
                    <p className="mt-2 text-blue-700">(Mirrors the current billing period)</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        )}

        {/* Bill Result */}
        {bill && !loading && (
          <div className="space-y-4" ref={resultRef}>
            {/* Bill Header */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      DCS
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {bill.header.dcsDisplayCode} — {bill.header.dcsName}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Bill Date
                    </p>
                    <p className="text-sm font-semibold">{formatDate(bill.header.billDate)}</p>
                  </div>
                  {bill.header.billNo && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Bill No
                      </p>
                      <p className="text-sm font-semibold">{bill.header.billNo}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Period
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDate(fromDate)} — {formatDate(toDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Bank
                    </p>
                    <p className="text-sm font-semibold">{bill.header.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Account No
                    </p>
                    <p className="text-sm font-semibold font-mono">{bill.header.accountNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Rate (Display)
                    </p>
                    <p className="text-sm font-semibold">
                      {formatRateDisplay(bill.header.rateDisplayOnBill)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milk Entries Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Milk Entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">
                          Shift
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider">
                          Quality
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Qty (L)
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Fat %
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          SNF %
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Rate (₹)
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                          Amount (₹)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bill.entries.map((entry, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="text-sm">{formatDate(entry.milkDate)}</TableCell>

                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold",
                                entry.shift === "M"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700",
                              )}
                            >
                              {entry.shift}
                            </span>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {entry.quality}
                          </TableCell>

                          <TableCell className="text-right text-sm tabular-nums">
                            {entry.quantity.toFixed(3)}
                          </TableCell>

                          <TableCell className="text-right text-sm tabular-nums">
                            {entry.fat.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right text-sm tabular-nums">
                            {entry.snf.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right text-sm tabular-nums">
                            {entry.rate.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right text-sm tabular-nums font-medium">
                            {formatCurrency(entry.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {bill.entries.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center h-16 text-muted-foreground text-sm"
                          >
                            No milk entries found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Total Quantity
                  </p>
                  <p className="text-2xl font-bold mt-1">{formatQuantity(bill.totals.quantity)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Total Milk Cost
                  </p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(bill.totals.amount)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quality Summary */}
            {(() => {
              const qualitySummary: Record<string, { quantity: number; amount: number }> = {};
              bill.entries.forEach((entry) => {
                if (!qualitySummary[entry.quality]) {
                  qualitySummary[entry.quality] = { quantity: 0, amount: 0 };
                }
                qualitySummary[entry.quality].quantity += entry.quantity;
                qualitySummary[entry.quality].amount += entry.amount;
              });

              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Summary by Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(qualitySummary).map(([quality, data]) => (
                        <div
                          key={quality}
                          className="flex items-center justify-between p-3 rounded-lg border border-muted-foreground/20 bg-muted/5"
                        >
                          <div>
                            <p className="text-sm font-semibold">{quality}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatQuantity(data.quantity)} L
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(data.amount)}</p>
                            <p className="text-xs text-muted-foreground">Amount</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Payments */}
            <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Payments</CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1">
                        {paymentsOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <p className="text-sm font-medium">Milk Cost</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(bill.payments.milkCost)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <p className="text-sm font-medium">Headload</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(bill.payments.headload)}
                        </p>
                      </div>
                    </div>

                    {bill.payments.additional.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Additional Payments
                        </p>
                        <div className="space-y-1">
                          {bill.payments.additional.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1.5 px-3 rounded bg-green-50 border border-green-100"
                            >
                              <p className="text-sm">{a.serviceName}</p>
                              <p className="text-sm font-semibold text-green-700 tabular-nums">
                                {formatCurrency(a.amount)}
                              </p>
                            </div>
                          ))}
                          <div className="flex items-center justify-between py-1.5 px-3 font-semibold">
                            <p className="text-sm">Additional Total</p>
                            <p className="text-sm text-green-700 tabular-nums">
                              {formatCurrency(additionalTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Price Difference */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                  Price Difference (Previous Period)
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    bill.priceDiff > 0
                      ? "text-green-600"
                      : bill.priceDiff < 0
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {bill.priceDiff > 0 ? "+" : ""}
                  {formatCurrency(bill.priceDiff)}
                </p>
              </CardContent>
            </Card>

            {/* Deductions */}
            <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Deductions</CardTitle>
                        <p className="text-2xl font-bold text-destructive mt-1">
                          {formatCurrency(bill.deductions.totalDeductions)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        {deductionsOpen ? "Hide" : "Show"} Details
                        {deductionsOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <Separator />

                    {/* Standard */}
                    {bill.deductions.standard.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Standard Deductions
                        </p>
                        <div className="space-y-1">
                          {bill.deductions.standard.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1 px-2">
                              <p className="text-sm text-muted-foreground">{d.name}</p>
                              <p className="text-sm tabular-nums text-destructive">
                                {formatCurrency(d.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other */}
                    {bill.deductions.other.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Other Deductions
                        </p>
                        <div className="space-y-1">
                          {bill.deductions.other.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1 px-2">
                              <p className="text-sm text-muted-foreground">{d.name}</p>
                              <p className="text-sm tabular-nums text-destructive">
                                {formatCurrency(d.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outstanding */}
                    {bill.deductions.outstanding.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Outstanding (Previous Period)
                        </p>
                        <div className="space-y-1">
                          {bill.deductions.outstanding.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1 px-2">
                              <div>
                                <p className="text-sm text-muted-foreground">{d.name}</p>
                                <p className="text-xs text-muted-foreground/60">
                                  {formatDate(d.fromDate)} — {formatDate(d.toDate)}
                                </p>
                              </div>
                              <p className="text-sm tabular-nums text-destructive">
                                {formatCurrency(d.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {bill.deductions.standard.length === 0 &&
                      bill.deductions.other.length === 0 &&
                      bill.deductions.outstanding.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No deductions for this bill.
                        </p>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Net Amount Summary */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                    Net Amount Calculation
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span>Total Milk Cost + Headload</span>
                      <span className="font-semibold">
                        {formatCurrency(bill.payments.milkCost + bill.payments.headload)}
                      </span>
                    </div>
                    {additionalTotal !== 0 && (
                      <div className="flex justify-between items-center py-1 text-green-600">
                        <span>+ Additional Payments</span>
                        <span className="font-semibold">+{formatCurrency(additionalTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1 text-destructive border-t pt-2">
                      <span>- Total Deductions</span>
                      <span className="font-semibold">
                        -{formatCurrency(bill.deductions.totalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                    Net Payable Amount
                  </p>
                  <p className="text-3xl font-bold text-green-700 mb-3">
                    {formatCurrency(bill.netPayable)}
                  </p>
                  <div className="bg-white rounded p-3 border border-green-100">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      In Words
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {numberToWords(Math.floor(bill.netPayable))} Rupees
                      {bill.netPayable % 1 > 0
                        ? ` and ${numberToWords(Math.round((bill.netPayable % 1) * 100))} Paise`
                        : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sticky Footer — Net Payable */}
        {bill && !loading && (
          <div className="fixed bottom-0 left-64 right-0 bg-card border-t shadow-lg z-50 print:static print:border-0 print:shadow-none">
            <div className="px-6 py-3 flex items-center gap-8 justify-end flex-wrap">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Milk Cost</p>
                <p className="text-base font-semibold">{formatCurrency(bill.payments.milkCost)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Headload</p>
                <p className="text-base font-semibold">{formatCurrency(bill.payments.headload)}</p>
              </div>
              {additionalTotal !== 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Additional
                  </p>
                  <p className="text-base font-semibold text-green-600">
                    +{formatCurrency(additionalTotal)}
                  </p>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Deductions
                </p>
                <p className="text-base font-semibold text-destructive">
                  -{formatCurrency(bill.deductions.totalDeductions)}
                </p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Net Payable
                </p>
                <p className="text-2xl font-bold" style={{ color: "#4CAF50" }}>
                  {formatCurrency(bill.netPayable)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {bill && !loading && (
        <div className="hidden print:block">
          <div className="w-full bg-white text-black text-[12px] leading-[1.35] px-2 py-1">
            <div className="text-[11px] grid grid-cols-3 items-start">
              <div className="text-left">Page: 1</div>
              <div className="text-center font-bold">(J.Z.D.U.S.S.Ltd.)</div>
              <div className="text-right">Reg. No.2902L</div>
            </div>

            <div className="mt-1 grid grid-cols-3 gap-2 items-start">
              <div>
                <div>Bill Date: {formatBillDate(bill.header.billDate)}</div>
                <div className="mt-2">Bill No: {bill.header.billNo || "-"}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Society Milk Bill</div>
                <div>
                  Dated: {formatBillDate(fromDate)} to {formatBillDate(toDate)}
                </div>
                <div className="font-semibold mt-1">Route Code: 262</div>
              </div>
              <div className="text-right">
                <div>Bank A/C No: {bill.header.accountNo || "37001403140000107"}</div>
                <div>Bank: {bill.header.bankName || ""}</div>
                <div className="font-semibold mt-1">Society Code:{bill.header.dcsDisplayCode}</div>
                <div className="font-semibold">Society Name: {bill.header.dcsName || "-"}</div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>Head Load: KG {fixed2(bill.payments.headload)}</div>
              <div className="text-center">Shift: 0</div>
              <div className="text-right">
                Rate: {formatRateDisplay(bill.header.rateDisplayOnBill)}
              </div>
            </div>

            <div className="border-t border-dashed border-black mt-2" />
            <table className="w-full mt-1 text-[12px]">
              <thead>
                <tr className="border-b border-dashed border-black">
                  <th className="text-left py-1 font-semibold">Date</th>
                  <th className="text-left py-1 font-semibold">Shift</th>
                  <th className="text-left py-1 font-semibold">Quality</th>
                  <th className="text-right py-1 font-semibold">Quantity</th>
                  <th className="text-right py-1 font-semibold">Fat %</th>
                  <th className="text-right py-1 font-semibold">SNF %</th>
                  <th className="text-right py-1 font-semibold">Rate</th>
                  <th className="text-right py-1 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.entries.map((entry, idx) => (
                  <tr key={`${entry.milkDate}-${idx}`}>
                    <td className="py-0.5">{formatBillDate(entry.milkDate)}</td>
                    <td className="py-0.5">{entry.shift}</td>
                    <td className="py-0.5">{(entry.quality || "SWEET").toUpperCase()}</td>
                    <td className="py-0.5 text-right">{fixed2(entry.quantity)}</td>
                    <td className="py-0.5 text-right">{fixed2(entry.fat)}</td>
                    <td className="py-0.5 text-right">{fixed2(entry.snf)}</td>
                    <td className="py-0.5 text-right">{fixed2(entry.rate)}</td>
                    <td className="py-0.5 text-right">{fixed2(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black mt-2" />
            <div className="grid grid-cols-[120px_1fr_120px_1fr] gap-x-2 gap-y-0 mt-2 items-end">
              <div>Total Milk</div>
              <div />
              <div className="text-right">Total Milk</div>
              <div />

              <div>Quantity</div>
              <div className="text-right">{fixed2(bill.totals.quantity)}</div>
              <div className="text-right">Amount</div>
              <div className="text-right">{fixed2(bill.totals.amount)}</div>
            </div>

            <div className="border-t border-dashed border-black mt-2" />
            <div className="grid grid-cols-[80px_70px_1fr_70px_1fr_70px_1fr] gap-x-2 gap-y-1 mt-2 items-end">
              <div>Quality</div>
              <div>SWEET</div>
              <div className="text-right">{fixed2(sweetSummary.quantity)}</div>
              <div>SOUR</div>
              <div className="text-right">{fixed2(sourSummary.quantity)}</div>
              <div>CURD</div>
              <div className="text-right">{fixed2(curdSummary.quantity)}</div>

              <div>Amount</div>
              <div>SWEET</div>
              <div className="text-right">{fixed2(sweetSummary.amount)}</div>
              <div>SOUR</div>
              <div className="text-right">{fixed2(sourSummary.amount)}</div>
              <div>CURD</div>
              <div className="text-right">{fixed2(curdSummary.amount)}</div>
            </div>

            <div className="border-t border-dashed border-black mt-2" />
            <div className="grid grid-cols-2 mt-2">
              <div>Price Difference Periodical</div>
              <div className="text-center">{fixed2(bill.priceDiff)}</div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-1">
              <div>
                <div className="grid grid-cols-2 font-semibold">
                  <div>Payment</div>
                  <div className="text-right">Amount</div>
                </div>
                <div className="grid grid-cols-2 mt-1">
                  <div>Milk Cost</div>
                  <div className="text-right">{fixed2(bill.payments.milkCost)}</div>
                </div>
                <div className="grid grid-cols-2 mt-0.5">
                  <div>Head Load Amount</div>
                  <div className="text-right">{fixed2(bill.payments.headload)}</div>
                </div>

                <div className="grid grid-cols-2 mt-2">
                  <div>Other Payment</div>
                  <div className="text-right">Amount</div>
                </div>
                {(bill.payments.additional.length > 0
                  ? bill.payments.additional
                  : [{ serviceName: "", amount: 0 }]
                ).map((item, idx) => (
                  <div key={`pay-${idx}`} className="grid grid-cols-2 mt-0.5">
                    <div>{item.serviceName || ""}</div>
                    <div className="text-right">{item.amount ? fixed2(item.amount) : ""}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="grid grid-cols-2 font-semibold">
                  <div>Deductions</div>
                  <div className="text-right">Amount</div>
                </div>
                {(printDeductions.length > 0
                  ? printDeductions
                  : [
                      { name: "DCS TRNG FUND", amount: 0 },
                      { name: "SHARE APP A/C", amount: 0 },
                      { name: "TEST CHEM FUND", amount: 0 },
                    ]
                ).map((item, idx) => (
                  <div key={`ded-${idx}`} className="grid grid-cols-2 mt-0.5">
                    <div>{item.name}</div>
                    <div className="text-right">{item.amount ? fixed2(item.amount) : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-black mt-2" />
            <div className="grid grid-cols-2 gap-8 mt-2">
              <div className="grid grid-cols-2">
                <div>Total Payment</div>
                <div className="text-right">{fixed2(totalPayment)}</div>
                <div>Net Amount.</div>
                <div className="text-right">{fixed2(bill.netPayable)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div>Total Deduction</div>
                <div className="text-right">{fixed2(bill.deductions.totalDeductions)}</div>
              </div>
            </div>

            <div className="grid grid-cols-[90px_1fr] mt-1 gap-2 items-start">
              <div>In Word</div>
              <div className="whitespace-nowrap">
                {numberToWords(Math.floor(bill.netPayable))}{" "}
                {Math.floor(bill.netPayable) === 1 ? "Rupee" : "Rupees"}{" "}
                {bill.netPayable % 1 > 0
                  ? `and ${numberToWords(Math.round((bill.netPayable % 1) * 100))} Paisa`
                  : "Only"}
              </div>
            </div>

            <div className="border-t border-dashed border-black mt-2" />
            <div className="grid grid-cols-5 mt-3 text-center">
              <div>Prepared By</div>
              <div>Checked By</div>
              <div>Accountant</div>
              <div>Account Officer</div>
              <div>MD</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
