import { useListDcsMonitoring } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, getStatusColor } from "@/lib/utils";

export default function DcsMonitoring() {
  const { data, isLoading } = useListDcsMonitoring();

  const passed = data?.filter(r => r.status === "pass").length ?? 0;
  const failed = data?.filter(r => r.status === "fail").length ?? 0;
  const pending = data?.filter(r => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">DCS Monitoring</h2>
        <p className="text-sm text-muted-foreground">Quality test records for all societies</p>
      </div>

      {/* Summary cards */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Passed</p>
              <p className="text-2xl font-bold mt-1 text-accent">{passed}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Failed</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{failed}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending</p>
              <p className="text-2xl font-bold mt-1">{pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Test Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Fat Reading</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">SNF Reading</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : data && data.length > 0 ? (
                data.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{r.societyName}</TableCell>
                    <TableCell className="text-sm">{formatDate(r.testDate)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">{r.fatReading.toFixed(2)}%</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">{r.snfReading.toFixed(2)}%</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(r.status)} className="capitalize text-xs">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">No DCS records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
