import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetBill } from "@workspace/api-client-react";
import { getGetBillQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ChevronDown, ChevronUp, Printer, Download, Edit,
} from "lucide-react";
import { formatCurrency, formatQuantity, formatDate, formatPercent, getStatusColor, cn } from "@/lib/utils";

export default function BillDetail() {
  const [, params] = useRoute("/bills/:id");
  const billId = parseInt(params?.id ?? "0");
  const [bankOpen, setBankOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [deductionsOpen, setDeductionsOpen] = useState(false);

  const { data: bill, isLoading } = useGetBill(billId, {
    query: { enabled: !!billId, queryKey: getGetBillQueryKey(billId) },
  });

  if (isLoading) return <BillDetailSkeleton />;
  if (!bill) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center">
        <p className="text-muted-foreground">Bill not found.</p>
        <Link href="/bills"><Button variant="link" className="mt-2">Back to Bills</Button></Link>
      </div>
    </div>
  );

  // Group milk entries by date
  const entriesByDate: Record<string, typeof bill.entries> = {};
  for (const entry of (bill.entries ?? [])) {
    if (!entriesByDate[entry.entryDate]) entriesByDate[entry.entryDate] = [];
    entriesByDate[entry.entryDate].push(entry);
  }

  // Group deductions by category
  const deductionsByCategory: Record<string, typeof bill.deductions> = {};
  for (const d of (bill.deductions ?? [])) {
    if (!deductionsByCategory[d.category]) deductionsByCategory[d.category] = [];
    deductionsByCategory[d.category].push(d);
  }

  const categoryLabels: Record<string, string> = {
    financial: "Financial Deductions",
    dcs_training: "DCS Training Fund",
    share_account: "Share Account",
    test_chem: "Test Chemical Fund",
    cattle_feed: "Cattle Feed",
    other: "Other",
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/bills">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1" />
        <Link href={`/bills/${bill.id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print PDF
        </Button>
        <Button size="sm" className="gap-1 bg-primary text-white hover:bg-primary/90">
          <Download className="w-4 h-4" />
          Bank Advice
        </Button>
      </div>

      {/* Bill Summary Card - Sticky */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bill Number</p>
              <p className="text-lg font-bold text-primary">{bill.billNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bill Date</p>
              <p className="text-base font-semibold">{formatDate(bill.billDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date Range</p>
              <p className="text-base font-semibold">{formatDate(bill.fromDate)} — {formatDate(bill.toDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Society</p>
              <p className="text-base font-semibold">{bill.societyName}</p>
              <p className="text-xs text-muted-foreground">{bill.societyCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Route</p>
              <p className="text-base font-semibold">{bill.routeCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shift</p>
              <p className="text-base font-semibold capitalize">{bill.shift}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</p>
              <Badge variant={getStatusColor(bill.status)} className="capitalize mt-1">{bill.status}</Badge>
            </div>
          </div>

          {/* Collapsible Bank Details */}
          {bill.bankName && (
            <Collapsible open={bankOpen} onOpenChange={setBankOpen}>
              <CollapsibleTrigger className="mt-3 flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Bank Details
                {bankOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 flex gap-6 p-3 bg-muted/30 rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="text-sm font-medium">{bill.bankName}</p>
                  </div>
                  {bill.bankAccount && (
                    <div>
                      <p className="text-xs text-muted-foreground">Account</p>
                      <p className="text-sm font-medium font-mono">{bill.bankAccount}</p>
                    </div>
                  )}
                  {bill.bankIfsc && (
                    <div>
                      <p className="text-xs text-muted-foreground">IFSC</p>
                      <p className="text-sm font-medium font-mono">{bill.bankIfsc}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Rate Formula */}
          {bill.rateFormula && (
            <Collapsible open={rateOpen} onOpenChange={setRateOpen}>
              <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Rate Formula
                {rateOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-muted/30 rounded-md">
                  <code className="text-sm font-mono">{bill.rateFormula}</code>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Quantity (L)</TableHead>
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
                    <React.Fragment key={date}>
                      {dayEntries.map((entry, idx) => (
                        <TableRow key={entry.id} className="hover:bg-muted/20">
                          {idx === 0 && (
                            <TableCell rowSpan={dayEntries.length} className="font-medium align-top pt-3 border-r border-border/40 text-sm">
                              {formatDate(date)}
                            </TableCell>
                          )}
                          <TableCell className="capitalize text-sm">{entry.shift}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{entry.quantity.toFixed(3)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{entry.fatPercent.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{entry.snfPercent.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{entry.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-medium">{formatCurrency(entry.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/5 font-medium">
                        <TableCell className="border-r border-border/40 text-muted-foreground text-sm">Daily Total</TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{dayQty.toFixed(3)} L</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(dayAmt)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {(!bill.entries || bill.entries.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-16 text-muted-foreground text-sm">
                      No milk entries for this bill.
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
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Milk Quantity</p>
            <p className="text-2xl font-bold mt-1">{formatQuantity(bill.totalQuantity)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Milk Cost</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(bill.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Section */}
      {bill.priceDifference !== undefined && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Price Difference</p>
                <p className={cn(
                  "text-xl font-bold mt-1",
                  bill.priceDifference > 0 ? "text-accent" : bill.priceDifference < 0 ? "text-destructive" : "text-foreground"
                )}>
                  {bill.priceDifference > 0 ? "+" : ""}{formatCurrency(bill.priceDifference)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bill.priceDifference > 0 ? "Above market rate" : bill.priceDifference < 0 ? "Below market rate" : "At market rate"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deductions Section */}
      <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Deductions</CardTitle>
                  <p className="text-2xl font-bold text-destructive mt-1">{formatCurrency(bill.totalDeductions)}</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  {deductionsOpen ? "Hide" : "Show"} Details
                  {deductionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="space-y-4">
                {Object.entries(deductionsByCategory).map(([category, items]) => {
                  const total = items.reduce((s, d) => s + d.amount, 0);
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground">{categoryLabels[category] ?? category}</p>
                        <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                      </div>
                      <div className="space-y-1 pl-4">
                        {items.map((d) => (
                          <div key={d.id} className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{d.label}</p>
                            <p className="text-sm tabular-nums">{formatCurrency(d.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(!bill.deductions || bill.deductions.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No deductions for this bill.</p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sticky Footer - Final Settlement */}
      <div className="fixed bottom-0 left-64 right-0 bg-card border-t shadow-lg z-50 print:hidden">
        <div className="px-6 py-3 flex items-center gap-8 justify-end">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Milk Cost</p>
            <p className="text-base font-semibold">{formatCurrency(bill.totalAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Lead Load</p>
            <p className="text-base font-semibold">{formatCurrency(bill.leadLoadAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Deductions</p>
            <p className="text-base font-semibold text-destructive">{formatCurrency(bill.totalDeductions)}</p>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Final Payable</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(bill.finalPayable)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}
