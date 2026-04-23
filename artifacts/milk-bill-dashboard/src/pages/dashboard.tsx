import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { FileText, Users, Droplet, TrendingUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SUMMARY = {
  totalBillsThisMonth: 142,
  totalMilkQuantity: 184320,
  totalAmount: 9216000,
  activeSocieties: 38,
  avgFatPercent: 6.4,
  avgSnfPercent: 8.6,
};

const RECENT_BILLS = [
  { billNo: "B-2024-0891", date: "10-06-2022", society: "Amul Dairy DCS", code: "8014", qty: 1820, amount: 91000, status: "paid" },
  { billNo: "B-2024-0890", date: "10-06-2022", society: "Sahakar DCS", code: "8015", qty: 1540, amount: 77000, status: "paid" },
  { billNo: "B-2024-0889", date: "10-06-2022", society: "Janta DCS", code: "8016", qty: 2100, amount: 105000, status: "issued" },
  { billNo: "B-2024-0888", date: "10-06-2022", society: "Krushi DCS", code: "8017", qty: 960, amount: 48000, status: "issued" },
  { billNo: "B-2024-0887", date: "10-06-2022", society: "Panchayat DCS", code: "8018", qty: 1280, amount: 64000, status: "draft" },
  { billNo: "B-2024-0886", date: "09-06-2022", society: "Amul Dairy DCS", code: "8014", qty: 1790, amount: 89500, status: "paid" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">Sample data — connect Oracle DB for live figures.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Bills This Month" value={SUMMARY.totalBillsThisMonth} icon={FileText} />
        <StatCard title="Total Milk Quantity" value={formatQuantity(SUMMARY.totalMilkQuantity)} icon={Droplet} />
        <StatCard title="Total Amount" value={formatCurrency(SUMMARY.totalAmount)} icon={TrendingUp} />
        <StatCard title="Active Societies" value={SUMMARY.activeSocieties} icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Fat %</p>
            <p className="text-2xl font-bold mt-1">{SUMMARY.avgFatPercent.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg SNF %</p>
            <p className="text-2xl font-bold mt-1">{SUMMARY.avgSnfPercent.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Bill No</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Qty (L)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_BILLS.map((bill) => (
                  <TableRow key={bill.billNo} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-primary text-sm">{bill.billNo}</TableCell>
                    <TableCell className="text-sm">{bill.date}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{bill.society}</p>
                      <p className="text-xs text-muted-foreground">{bill.code}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{bill.qty.toLocaleString("en-IN")} L</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(bill.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={bill.status === "paid" ? "default" : bill.status === "issued" ? "secondary" : "outline"}
                        className="capitalize text-xs"
                      >
                        {bill.status}
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

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}
