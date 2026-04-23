import { useGetDashboardSummary, useGetRecentBills } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatQuantity, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Map, Droplet, TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentBills, isLoading: isLoadingBills } = useGetRecentBills();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bills (This Month)"
          value={summary?.totalBillsThisMonth}
          icon={FileText}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Milk Quantity"
          value={summary?.totalMilkQuantity ? formatQuantity(summary.totalMilkQuantity) : undefined}
          icon={Droplet}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Amount"
          value={summary?.totalAmount ? formatCurrency(summary.totalAmount) : undefined}
          icon={TrendingUp}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Pending Bills"
          value={summary?.pendingBills}
          icon={FileText}
          isLoading={isLoadingSummary}
          alert={summary?.pendingBills ? summary.pendingBills > 0 : false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Societies"
          value={summary?.totalSocieties}
          icon={Users}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Avg Fat %"
          value={summary?.avgFatPercent ? `${summary.avgFatPercent.toFixed(1)}%` : undefined}
          icon={ActivityIcon}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Avg SNF %"
          value={summary?.avgSnfPercent ? `${summary.avgSnfPercent.toFixed(1)}%` : undefined}
          icon={ActivityIcon}
          isLoading={isLoadingSummary}
        />
      </div>

      {/* Recent Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBills ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Society</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(recentBills) && recentBills.length > 0 ? (
                    recentBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {bill.societyName} ({bill.societyCode})
                        </TableCell>
                        <TableCell className="text-right">
                          {formatQuantity(bill.totalQuantity)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(bill.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "paid"
                                ? "default"
                                : bill.status === "issued"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No recent bills found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  alert = false,
}: {
  title: string;
  value?: string | number;
  icon: React.ElementType;
  isLoading: boolean;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className={cn("text-2xl font-bold", alert ? "text-destructive" : "")}>
              {value !== undefined ? value : "—"}
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon(props: any) {
  return <TrendingUp {...props} />;
}
