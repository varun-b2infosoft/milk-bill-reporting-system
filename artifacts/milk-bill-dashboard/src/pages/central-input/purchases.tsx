import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity } from "@/lib/utils";

const PURCHASES = [
  { id: 1, society: "Amul Dairy DCS", date: "10-06-2022", shift: "morning", qty: 104, fat: 6.2, snf: 8.6, rate: 48.5, amount: 5044 },
  { id: 2, society: "Amul Dairy DCS", date: "10-06-2022", shift: "evening", qty: 58, fat: 6.6, snf: 8.6, rate: 51.5, amount: 2987 },
  { id: 3, society: "Sahakar DCS", date: "10-06-2022", shift: "morning", qty: 136, fat: 6.3, snf: 8.7, rate: 49.25, amount: 6698 },
  { id: 4, society: "Sahakar DCS", date: "10-06-2022", shift: "evening", qty: 74, fat: 6.8, snf: 8.7, rate: 53.0, amount: 3922 },
  { id: 5, society: "Janta DCS", date: "10-06-2022", shift: "morning", qty: 162, fat: 6.1, snf: 8.6, rate: 47.75, amount: 7736 },
  { id: 6, society: "Janta DCS", date: "10-06-2022", shift: "evening", qty: 89, fat: 6.9, snf: 8.6, rate: 53.75, amount: 4784 },
  { id: 7, society: "Krushi DCS", date: "09-06-2022", shift: "morning", qty: 98, fat: 6.4, snf: 8.6, rate: 50.0, amount: 4900 },
  { id: 8, society: "Krushi DCS", date: "09-06-2022", shift: "evening", qty: 52, fat: 7.1, snf: 8.7, rate: 55.25, amount: 2873 },
  { id: 9, society: "Panchayat DCS", date: "09-06-2022", shift: "morning", qty: 124, fat: 6.2, snf: 8.6, rate: 48.5, amount: 6014 },
  { id: 10, society: "Panchayat DCS", date: "09-06-2022", shift: "evening", qty: 68, fat: 6.7, snf: 8.6, rate: 52.25, amount: 3553 },
];

const totalQty = PURCHASES.reduce((s, p) => s + p.qty, 0);
const totalAmt = PURCHASES.reduce((s, p) => s + p.amount, 0);

export default function Purchases() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Purchases</h2>
        <p className="text-sm text-muted-foreground">{PURCHASES.length} records — sample data</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Quantity</p>
            <p className="text-2xl font-bold mt-1">{formatQuantity(totalQty)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalAmt)}</p>
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Shift</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Qty (L)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Fat%</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">SNF%</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Rate (₹)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PURCHASES.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{p.society}</TableCell>
                    <TableCell className="text-sm">{p.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{p.shift}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.qty.toFixed(3)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.fat.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.snf.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">₹{p.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-semibold">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/5 font-semibold">
                  <TableCell colSpan={3} className="text-sm">Total</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{totalQty.toFixed(3)}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(totalAmt)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
