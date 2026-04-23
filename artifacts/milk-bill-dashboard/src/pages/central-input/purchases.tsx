import { useState } from "react";
import { useListPurchases, useCreatePurchase, useListSocieties, getListPurchasesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus } from "lucide-react";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const purchaseSchema = z.object({
  societyId: z.coerce.number().min(1, "Society is required"),
  purchaseDate: z.string().min(1),
  quantity: z.coerce.number().positive(),
  fatPercent: z.coerce.number().min(0).max(10),
  snfPercent: z.coerce.number().min(0).max(15),
  rate: z.coerce.number().positive(),
  shift: z.enum(["morning", "evening"]),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function Purchases() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useListPurchases();
  const createPurchase = useCreatePurchase();
  const { data: societies } = useListSocieties();

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { purchaseDate: today, shift: "morning" },
  });

  const onSubmit = (data: PurchaseFormData) => {
    createPurchase.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        setOpen(false);
        reset();
      },
    });
  };

  const totalQty = data?.reduce((s, p) => s + p.quantity, 0) ?? 0;
  const totalAmt = data?.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Purchases</h2>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} records</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1 bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Add Purchase
        </Button>
      </div>

      {/* Summary */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Quantity</p>
              <p className="text-2xl font-bold mt-1">{formatQuantity(totalQty)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
              <p className="text-2xl font-bold mt-1 text-accent">{formatCurrency(totalAmt)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Society</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Qty (L)</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Fat%</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">SNF%</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Rate</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : data && data.length > 0 ? (
                data.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{p.societyName}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.purchaseDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{p.shift}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.quantity.toFixed(3)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.fatPercent.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.snfPercent.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">₹{p.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-semibold">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-sm">No purchase records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Purchase Record</DialogTitle>
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
              {errors.societyId && <p className="text-xs text-destructive">{errors.societyId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date</Label>
                <Input type="date" {...register("purchaseDate")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Shift</Label>
                <Select onValueChange={(v: "morning" | "evening") => setValue("shift", v)} defaultValue="morning">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Quantity (L)</Label>
                <Input type="number" step="0.001" {...register("quantity")} placeholder="0.000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rate (₹)</Label>
                <Input type="number" step="0.01" {...register("rate")} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fat %</Label>
                <Input type="number" step="0.01" {...register("fatPercent")} placeholder="4.20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">SNF %</Label>
                <Input type="number" step="0.01" {...register("snfPercent")} placeholder="8.50" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createPurchase.isPending} className="bg-primary text-white">
                {createPurchase.isPending ? "Adding..." : "Add Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
