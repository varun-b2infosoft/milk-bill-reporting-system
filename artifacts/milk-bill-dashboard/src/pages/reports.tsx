import { useState } from "react";
import { useGetMonthlySummary, useGetYearlySummary, getGetMonthlySummaryQueryKey, getGetYearlySummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity, MONTH_NAMES } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlySummary(
    { year: selectedYear },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ year: selectedYear }) } }
  );
  const { data: yearly, isLoading: yearlyLoading } = useGetYearlySummary(
    { year: selectedYear },
    { query: { queryKey: getGetYearlySummaryQueryKey({ year: selectedYear }) } }
  );

  const chartData = (yearly?.monthlyBreakdown ?? []).map((m) => ({
    month: MONTH_NAMES[m.month - 1]?.slice(0, 3),
    "Quantity (L)": m.totalQuantity,
    "Amount (₹)": m.totalAmount / 1000,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reports</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Year</label>
          <select
            className="h-8 text-sm px-2 border rounded-md bg-background"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Milk Quantity by Month — {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => n === "Amount (₹)" ? `₹${(v as number * 1000).toLocaleString("en-IN")}` : `${v} L`} />
                    <Bar dataKey="Quantity (L)" fill="#0B5FA5" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Bills</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Quantity</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Deductions</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Payable</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Avg Fat%</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Avg SNF%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>)}</TableRow>
                    ))
                  ) : monthly && monthly.length > 0 ? (
                    monthly.map((m) => (
                      <TableRow key={m.month} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{MONTH_NAMES[m.month - 1]} {m.year}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.totalBills}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatQuantity(m.totalQuantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(m.totalAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(m.totalDeductions)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-accent">{formatCurrency(m.totalPayable)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.avgFat.toFixed(1)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{m.avgSnf.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-sm">
                        No data for {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          {yearlyLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : yearly ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Bills</p>
                    <p className="text-2xl font-bold mt-1">{yearly.totalBills}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Quantity</p>
                    <p className="text-2xl font-bold mt-1">{formatQuantity(yearly.totalQuantity)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(yearly.totalAmount)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-accent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Payable</p>
                    <p className="text-2xl font-bold mt-1 text-accent">{formatCurrency(yearly.totalPayable)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Yearly breakdown chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Breakdown — {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v, n) => n === "Amount (₹)" ? `₹${(v as number * 1000).toLocaleString("en-IN")}` : `${v} L`} />
                      <Legend />
                      <Bar dataKey="Quantity (L)" fill="#0B5FA5" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Amount (₹)" fill="#4CAF50" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                No data for {selectedYear}.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
