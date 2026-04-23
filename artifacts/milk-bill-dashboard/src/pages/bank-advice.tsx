import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const RECORDS = [
  { id: 1, billNo: "B-2024-0891", society: "Amul Dairy DCS", bank: "State Bank of India", account: "30987654321", ifsc: "SBIN0001234", amount: 91000, date: "12-06-2022", status: "processed" },
  { id: 2, billNo: "B-2024-0890", society: "Sahakar DCS", bank: "Bank of Baroda", account: "21234567890", ifsc: "BARB0SAHAKAR", amount: 77000, date: "12-06-2022", status: "processed" },
  { id: 3, billNo: "B-2024-0889", society: "Janta DCS", bank: "Punjab National Bank", account: "4567890123456", ifsc: "PUNB0112300", amount: 105000, date: "12-06-2022", status: "pending" },
  { id: 4, billNo: "B-2024-0888", society: "Krushi DCS", bank: "State Bank of India", account: "30112233445", ifsc: "SBIN0005678", amount: 48000, date: "12-06-2022", status: "pending" },
  { id: 5, billNo: "B-2024-0887", society: "Panchayat DCS", bank: "Canara Bank", account: "8901234567890", ifsc: "CNRB0007890", amount: 64000, date: "12-06-2022", status: "draft" },
  { id: 6, billNo: "B-2024-0886", society: "Amul Dairy DCS", bank: "State Bank of India", account: "30987654321", ifsc: "SBIN0001234", amount: 89500, date: "11-06-2022", status: "processed" },
  { id: 7, billNo: "B-2024-0885", society: "Sahakar DCS", bank: "Bank of Baroda", account: "21234567890", ifsc: "BARB0SAHAKAR", amount: 74500, date: "11-06-2022", status: "processed" },
  { id: 8, billNo: "B-2024-0884", society: "Janta DCS", bank: "Punjab National Bank", account: "4567890123456", ifsc: "PUNB0112300", amount: 98000, date: "11-06-2022", status: "processed" },
];

const total = RECORDS.reduce((s, r) => s + r.amount, 0);
const processed = RECORDS.filter(r => r.status === "processed").length;
const pending = RECORDS.filter(r => r.status === "pending").length;

export default function BankAdvice() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bank Advice</h2>
          <p className="text-sm text-muted-foreground">{RECORDS.length} records — sample data</p>
        </div>
        <Button size="sm" className="gap-1 bg-primary text-white hover:bg-primary/90">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 flex flex-wrap gap-8 items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Records</p>
            <p className="text-2xl font-bold">{RECORDS.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Processed</p>
            <p className="text-2xl font-bold text-green-600">{processed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{pending}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md">
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
                {RECORDS.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-primary text-sm">{r.billNo}</TableCell>
                    <TableCell className="text-sm">{r.society}</TableCell>
                    <TableCell className="text-sm">{r.bank}</TableCell>
                    <TableCell className="text-sm font-mono">{r.account}</TableCell>
                    <TableCell className="text-sm font-mono">{r.ifsc}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "processed" ? "default" : r.status === "pending" ? "secondary" : "outline"}
                        className="capitalize text-xs"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
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
