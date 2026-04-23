import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MONTHLY = [
  { month: "Apr", quantity: 14200, amount: 710000, bills: 11 },
  { month: "May", quantity: 15800, amount: 790000, bills: 13 },
  { month: "Jun", quantity: 18432, amount: 921600, bills: 14 },
  { month: "Jul", quantity: 16900, amount: 845000, bills: 12 },
  { month: "Aug", quantity: 17300, amount: 865000, bills: 13 },
  { month: "Sep", quantity: 15600, amount: 780000, bills: 11 },
  { month: "Oct", quantity: 16100, amount: 805000, bills: 12 },
  { month: "Nov", quantity: 14800, amount: 740000, bills: 11 },
  { month: "Dec", quantity: 13200, amount: 660000, bills: 10 },
  { month: "Jan", quantity: 12900, amount: 645000, bills: 10 },
  { month: "Feb", quantity: 11800, amount: 590000, bills: 9 },
  { month: "Mar", quantity: 13400, amount: 670000, bills: 10 },
];

const totalQty = MONTHLY.reduce((s, m) => s + m.quantity, 0);
const totalAmt = MONTHLY.reduce((s, m) => s + m.amount, 0);
const totalBills = MONTHLY.reduce((s, m) => s + m.bills, 0);

const chartData = MONTHLY.map(m => ({
  month: m.month,
  "Quantity (L)": m.quantity,
  "Amount (₹K)": Math.round(m.amount / 1000),
}));

export default function Reports() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">Sample data — FY 2022-23</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Quantity</p>
            <p className="text-2xl font-bold mt-1">{formatQuantity(totalQty)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmt)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Bills</p>
            <p className="text-2xl font-bold mt-1">{totalBills}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart">
        <TabsList className="mb-4">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Monthly Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Milk Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => [Number(v).toLocaleString("en-IN"), name]} />
                  <Legend />
                  <Bar dataKey="Quantity (L)" fill="#0B5FA5" radius={[4,4,0,0]} />
                  <Bar dataKey="Amount (₹K)" fill="#4CAF50" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Month</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Bills</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Quantity (L)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MONTHLY.map((m) => (
                      <TableRow key={m.month} className="hover:bg-muted/20">
                        <TableCell className="font-medium text-sm">{m.month}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{m.bills}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{m.quantity.toLocaleString("en-IN")} L</TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-semibold">{formatCurrency(m.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-semibold">
                      <TableCell className="text-sm">Total</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{totalBills}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{totalQty.toLocaleString("en-IN")} L</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatCurrency(totalAmt)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
