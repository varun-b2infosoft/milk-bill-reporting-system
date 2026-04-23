import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const RECORDS = [
  { id: 1, society: "Amul Dairy DCS", code: "8014", testDate: "10-06-2022", fatReading: 6.4, snfReading: 8.6, status: "pass", remarks: "Quality satisfactory" },
  { id: 2, society: "Sahakar DCS", code: "8015", testDate: "10-06-2022", fatReading: 6.1, snfReading: 8.5, status: "pass", remarks: null },
  { id: 3, society: "Janta DCS", code: "8016", testDate: "10-06-2022", fatReading: 5.8, snfReading: 8.3, status: "fail", remarks: "Fat below threshold" },
  { id: 4, society: "Krushi DCS", code: "8017", testDate: "10-06-2022", fatReading: 6.9, snfReading: 8.7, status: "pass", remarks: "Excellent quality" },
  { id: 5, society: "Panchayat DCS", code: "8018", testDate: "10-06-2022", fatReading: 6.2, snfReading: 8.6, status: "pass", remarks: null },
  { id: 6, society: "Amul Dairy DCS", code: "8014", testDate: "09-06-2022", fatReading: 6.5, snfReading: 8.6, status: "pass", remarks: null },
  { id: 7, society: "Sahakar DCS", code: "8015", testDate: "09-06-2022", fatReading: 6.0, snfReading: 8.4, status: "pending", remarks: "Re-test pending" },
  { id: 8, society: "Janta DCS", code: "8016", testDate: "09-06-2022", fatReading: 6.3, snfReading: 8.6, status: "pass", remarks: null },
];

const passed = RECORDS.filter(r => r.status === "pass").length;
const failed = RECORDS.filter(r => r.status === "fail").length;
const pending = RECORDS.filter(r => r.status === "pending").length;

function statusVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "pass") return "default";
  if (s === "fail") return "destructive";
  if (s === "pending") return "secondary";
  return "outline";
}

export default function DcsMonitoring() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">DCS Monitoring</h2>
        <p className="text-sm text-muted-foreground">Quality test records — sample data</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Passed</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{passed}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Failed</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{failed}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending</p>
            <p className="text-2xl font-bold mt-1 text-amber-500">{pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Test Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Fat %</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">SNF %</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECORDS.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="text-sm font-medium">{r.society}</p>
                      <p className="text-xs text-muted-foreground">{r.code}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.testDate}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.fatReading.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.snfReading.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)} className="capitalize text-xs">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
