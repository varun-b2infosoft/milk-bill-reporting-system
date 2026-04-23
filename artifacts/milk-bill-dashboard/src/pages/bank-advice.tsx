import { useState } from "react";
import { useListBankAdvice, getListBankAdviceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function BankAdvice() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const params = {
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const { data, isLoading } = useListBankAdvice(params, {
    query: { queryKey: getListBankAdviceQueryKey(params) },
  });

  const total = data?.reduce((s, b) => s + b.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bank Advice</h2>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} records</p>
        </div>
        <Button size="sm" className="gap-1 bg-primary text-white hover:bg-primary/90">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data && data.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex gap-8 items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Records</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Processed</p>
              <p className="text-2xl font-bold text-accent">{data.filter(b => b.status === "processed").length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending</p>
              <p className="text-2xl font-bold text-warning">{data.filter(b => b.status === "pending").length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Bill No</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Bank</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider font-mono">Account</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider font-mono">IFSC</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data && data.length > 0 ? (
                  data.map((advice) => (
                    <TableRow key={advice.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-primary text-sm">{advice.billNumber}</TableCell>
                      <TableCell className="text-sm">{advice.societyName}</TableCell>
                      <TableCell className="text-sm">{advice.bankName ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{advice.bankAccount ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{advice.bankIfsc ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(advice.amount)}</TableCell>
                      <TableCell className="text-sm">{formatDate(advice.adviceDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(advice.status)} className="capitalize text-xs">
                          {advice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-sm">
                      No bank advice records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
