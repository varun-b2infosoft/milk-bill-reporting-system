import { useListTargets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatQuantity, cn } from "@/lib/utils";

export default function Performance() {
  const { data: targets, isLoading } = useListTargets();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Performance</h2>
        <p className="text-sm text-muted-foreground">Society-wise performance vs. targets</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : targets && targets.length > 0 ? (
        <div className="space-y-3">
          {targets.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{t.societyName}</p>
                    <p className="text-xs text-muted-foreground">{t.period}</p>
                  </div>
                  <span className={cn(
                    "text-lg font-bold",
                    t.percentAchieved >= 100 ? "text-accent" : t.percentAchieved >= 80 ? "text-primary" : "text-warning"
                  )}>
                    {t.percentAchieved.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(t.percentAchieved, 100)} className="h-2 mb-3" />
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Target Qty</p>
                    <p className="text-sm font-semibold">{t.targetQuantity.toFixed(0)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Achieved Qty</p>
                    <p className="text-sm font-semibold">{t.achievedQuantity.toFixed(0)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target Amount</p>
                    <p className="text-sm font-semibold">{formatCurrency(t.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Achieved Amount</p>
                    <p className="text-sm font-semibold">{formatCurrency(t.achievedAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No performance data available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
