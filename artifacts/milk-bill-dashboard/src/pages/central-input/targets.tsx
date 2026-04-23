import { useListTargets, useCreateTarget, useListSocieties, getListTargetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import { formatCurrency, formatQuantity, cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const targetSchema = z.object({
  societyId: z.coerce.number().min(1),
  period: z.string().min(1),
  targetQuantity: z.coerce.number().positive(),
  targetAmount: z.coerce.number().positive(),
});

type TargetFormData = z.infer<typeof targetSchema>;

export default function Targets() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useListTargets();
  const createTarget = useCreateTarget();
  const { data: societies } = useListSocieties();

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: { period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
  });

  const onSubmit = (data: TargetFormData) => {
    createTarget.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Targets</h2>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} societies</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1 bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Set Target
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Period</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Target Qty</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Achieved</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Target Amount</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Achieved</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : data && data.length > 0 ? (
                data.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{t.societyName}</TableCell>
                    <TableCell className="text-sm">{t.period}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatQuantity(t.targetQuantity)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatQuantity(t.achievedQuantity)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCurrency(t.targetAmount)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCurrency(t.achievedAmount)}</TableCell>
                    <TableCell className="min-w-32">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(t.percentAchieved, 100)}
                          className="h-2 flex-1"
                        />
                        <span className={cn(
                          "text-xs font-semibold w-12 text-right tabular-nums",
                          t.percentAchieved >= 100 ? "text-accent" : t.percentAchieved >= 80 ? "text-primary" : "text-warning"
                        )}>
                          {t.percentAchieved.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">No targets set.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Target</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Society</Label>
              <Select onValueChange={(v) => setValue("societyId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select society" /></SelectTrigger>
                <SelectContent>
                  {societies?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Period (YYYY-MM)</Label>
              <Input {...register("period")} placeholder="2026-04" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Target Quantity (L)</Label>
              <Input type="number" step="0.001" {...register("targetQuantity")} placeholder="3500.000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Target Amount (₹)</Label>
              <Input type="number" step="0.01" {...register("targetAmount")} placeholder="150000.00" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createTarget.isPending} className="bg-primary text-white">
                {createTarget.isPending ? "Saving..." : "Save Target"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
