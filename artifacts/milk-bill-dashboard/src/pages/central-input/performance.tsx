import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PERFORMANCE = [
  { id: 1, society: "Amul Dairy DCS", code: "8014", period: "Jun 2022", targetQty: 2000, achievedQty: 1820, targetAmt: 100000, achievedAmt: 91000 },
  { id: 2, society: "Sahakar DCS", code: "8015", period: "Jun 2022", targetQty: 1800, achievedQty: 1540, targetAmt: 90000, achievedAmt: 77000 },
  { id: 3, society: "Janta DCS", code: "8016", period: "Jun 2022", targetQty: 2200, achievedQty: 2350, targetAmt: 110000, achievedAmt: 117500 },
  { id: 4, society: "Krushi DCS", code: "8017", period: "Jun 2022", targetQty: 1000, achievedQty: 960, targetAmt: 50000, achievedAmt: 48000 },
  { id: 5, society: "Panchayat DCS", code: "8018", period: "Jun 2022", targetQty: 1400, achievedQty: 1280, targetAmt: 70000, achievedAmt: 64000 },
];

export default function Performance() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Performance</h2>
        <p className="text-sm text-muted-foreground">Society-wise performance vs. targets — sample data</p>
      </div>

      <div className="space-y-3">
        {PERFORMANCE.map((t) => {
          const pctQty = Math.min(Math.round((t.achievedQty / t.targetQty) * 100), 150);
          const pctAmt = Math.min(Math.round((t.achievedAmt / t.targetAmt) * 100), 150);
          const over = pctQty >= 100;
          return (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{t.society}</p>
                    <p className="text-xs text-muted-foreground">{t.code} · {t.period}</p>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded",
                    over ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {pctQty}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Quantity</span>
                      <span>{formatQuantity(t.achievedQty)} / {formatQuantity(t.targetQty)}</span>
                    </div>
                    <Progress value={Math.min(pctQty, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Amount</span>
                      <span>{formatCurrency(t.achievedAmt)} / {formatCurrency(t.targetAmt)}</span>
                    </div>
                    <Progress value={Math.min(pctAmt, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
