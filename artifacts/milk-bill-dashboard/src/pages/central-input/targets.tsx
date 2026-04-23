import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity, cn } from "@/lib/utils";

const TARGETS = [
  { id: 1, society: "Amul Dairy DCS", code: "8014", period: "Jun 2022", targetQty: 2000, targetAmt: 100000, achievedQty: 1820, achievedAmt: 91000 },
  { id: 2, society: "Sahakar DCS", code: "8015", period: "Jun 2022", targetQty: 1800, targetAmt: 90000, achievedQty: 1540, achievedAmt: 77000 },
  { id: 3, society: "Janta DCS", code: "8016", period: "Jun 2022", targetQty: 2200, targetAmt: 110000, achievedQty: 2350, achievedAmt: 117500 },
  { id: 4, society: "Krushi DCS", code: "8017", period: "Jun 2022", targetQty: 1000, targetAmt: 50000, achievedQty: 960, achievedAmt: 48000 },
  { id: 5, society: "Panchayat DCS", code: "8018", period: "Jun 2022", targetQty: 1400, targetAmt: 70000, achievedQty: 1280, achievedAmt: 64000 },
];

export default function Targets() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Targets</h2>
        <p className="text-sm text-muted-foreground">Society-wise targets for the period — sample data</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Period</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Target Qty (L)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Achieved Qty (L)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Target Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Achieved Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Achievement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TARGETS.map((t) => {
                  const pct = Math.round((t.achievedQty / t.targetQty) * 100);
                  const over = pct >= 100;
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/20">
                      <TableCell>
                        <p className="text-sm font-medium">{t.society}</p>
                        <p className="text-xs text-muted-foreground">{t.code}</p>
                      </TableCell>
                      <TableCell className="text-sm">{t.period}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatQuantity(t.targetQty)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatQuantity(t.achievedQty)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatCurrency(t.targetAmt)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-semibold">{formatCurrency(t.achievedAmt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                          <span className={cn(
                            "text-xs font-bold w-10 text-right",
                            over ? "text-green-600" : "text-amber-600"
                          )}>
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
