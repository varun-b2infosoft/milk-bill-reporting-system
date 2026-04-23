import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChevronDown, ChevronUp, Printer, AlertCircle,
} from "lucide-react";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Types (mirrors backend MilkBillResult) ──────────────────────────────────

interface BillHeader {
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
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/api`;
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
  const [prevFromDate, setPrevFromDate] = useState("");
  const [prevToDate, setPrevToDate] = useState("");
  const [showPrev, setShowPrev] = useState(false);

  const [bill, setBill] = useState<MilkBillResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deductionsOpen, setDeductionsOpen] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !dcsCode.trim()) return;

    setLoading(true);
    setError(null);
    setBill(null);

    try {
      const result = await fetchMilkBill({
        fromDate,
        toDate,
        dcsCode: dcsCode.trim(),
        prevFromDate: showPrev ? prevFromDate || undefined : undefined,
        prevToDate: showPrev ? prevToDate || undefined : undefined,
      });
      setBill(result);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to fetch bill. Please check the parameters.");
    } finally {
      setLoading(false);
    }
  };

  // Group entries by date for display
  const entriesByDate: Record<string, BillEntry[]> = {};
  for (const e of (bill?.entries ?? [])) {
    if (!entriesByDate[e.milkDate]) entriesByDate[e.milkDate] = [];
    entriesByDate[e.milkDate].push(e);
  }

  const additionalTotal = (bill?.payments.additional ?? []).reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-4 pb-32">
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

            {/* Optional previous period toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowPrev((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                {showPrev ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showPrev ? "Hide" : "Add"} Previous Period (for outstanding deductions &amp; price difference)
              </button>

              {showPrev && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Previous From Date
                    </label>
                    <Input
                      type="date"
                      value={prevFromDate}
                      onChange={(e) => setPrevFromDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Previous To Date
                    </label>
                    <Input
                      type="date"
                      value={prevToDate}
                      onChange={(e) => setPrevToDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}
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
                  setFromDate(""); setToDate(""); setDcsCode("");
                  setPrevFromDate(""); setPrevToDate(""); setShowPrev(false);
                  setBill(null); setError(null);
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
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">DCS</p>
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
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bill Date</p>
                  <p className="text-sm font-semibold">{formatDate(bill.header.billDate)}</p>
                </div>
                {bill.header.billNo && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bill No</p>
                    <p className="text-sm font-semibold">{bill.header.billNo}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Period</p>
                  <p className="text-sm font-semibold">{formatDate(fromDate)} — {formatDate(toDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bank</p>
                  <p className="text-sm font-semibold">{bill.header.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Account No</p>
                  <p className="text-sm font-semibold font-mono">{bill.header.accountNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rate (Display)</p>
                  <p className="text-sm font-semibold">₹{bill.header.rateDisplayOnBill?.toFixed(2)}</p>
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
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Shift</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Quality</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Qty (L)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Fat %</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">SNF %</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Rate (₹)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(entriesByDate).map(([date, dayEntries]) => {
                      const dayQty = dayEntries.reduce((s, e) => s + e.quantity, 0);
                      const dayAmt = dayEntries.reduce((s, e) => s + e.amount, 0);
                      return (
                        <>
                          {dayEntries.map((entry, idx) => (
                            <TableRow key={`${date}-${entry.shift}`} className="hover:bg-muted/20">
                              {idx === 0 && (
                                <TableCell
                                  rowSpan={dayEntries.length}
                                  className="font-medium align-top pt-3 border-r border-border/40 text-sm"
                                >
                                  {formatDate(date)}
                                </TableCell>
                              )}
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold",
                                  entry.shift === "M"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                                )}>
                                  {entry.shift}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{entry.quality}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{entry.quantity.toFixed(3)}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{entry.fat.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{entry.snf.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{entry.rate.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums font-medium">{formatCurrency(entry.amount)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-primary/5 font-medium">
                            <TableCell className="border-r border-border/40 text-muted-foreground text-xs">Daily Total</TableCell>
                            <TableCell colSpan={5}></TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{dayQty.toFixed(3)} L</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{formatCurrency(dayAmt)}</TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                    {bill.entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-16 text-muted-foreground text-sm">
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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Quantity</p>
                <p className="text-2xl font-bold mt-1">{formatQuantity(bill.totals.quantity)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Milk Cost</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(bill.totals.amount)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payments */}
          <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Payments</CardTitle>
                    <Button variant="ghost" size="sm" className="gap-1">
                      {paymentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">Milk Cost</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(bill.payments.milkCost)}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">Headload</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(bill.payments.headload)}</p>
                    </div>
                  </div>

                  {bill.payments.additional.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Additional Payments
                      </p>
                      <div className="space-y-1">
                        {bill.payments.additional.map((a, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded bg-green-50 border border-green-100">
                            <p className="text-sm">{a.serviceName}</p>
                            <p className="text-sm font-semibold text-green-700 tabular-nums">{formatCurrency(a.amount)}</p>
                          </div>
                        ))}
                        <div className="flex items-center justify-between py-1.5 px-3 font-semibold">
                          <p className="text-sm">Additional Total</p>
                          <p className="text-sm text-green-700 tabular-nums">{formatCurrency(additionalTotal)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {bill.priceDiff !== 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <p className="text-sm font-medium">Price Difference (Prev Period)</p>
                      <p className={cn(
                        "text-sm font-semibold tabular-nums",
                        bill.priceDiff > 0 ? "text-green-600" : "text-destructive"
                      )}>
                        {bill.priceDiff > 0 ? "+" : ""}{formatCurrency(bill.priceDiff)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
                      {deductionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                            <p className="text-sm tabular-nums text-destructive">{formatCurrency(d.amount)}</p>
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
                            <p className="text-sm tabular-nums text-destructive">{formatCurrency(d.amount)}</p>
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
                            <p className="text-sm tabular-nums text-destructive">{formatCurrency(d.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bill.deductions.standard.length === 0 &&
                    bill.deductions.other.length === 0 &&
                    bill.deductions.outstanding.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No deductions for this bill.</p>
                    )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
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
            {bill.priceDiff !== 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Price Diff</p>
                <p className={cn(
                  "text-base font-semibold",
                  bill.priceDiff > 0 ? "text-green-600" : "text-destructive"
                )}>
                  {bill.priceDiff > 0 ? "+" : ""}{formatCurrency(bill.priceDiff)}
                </p>
              </div>
            )}
            {additionalTotal !== 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Additional</p>
                <p className="text-base font-semibold text-green-600">+{formatCurrency(additionalTotal)}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Deductions</p>
              <p className="text-base font-semibold text-destructive">
                -{formatCurrency(bill.deductions.totalDeductions)}
              </p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net Payable</p>
              <p className="text-2xl font-bold" style={{ color: "#4CAF50" }}>{formatCurrency(bill.netPayable)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
