import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateBill, useListSocieties, useListRoutes, getListBillsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const billSchema = z.object({
  billNumber: z.string().min(1, "Bill number is required"),
  billDate: z.string().min(1, "Bill date is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  societyId: z.coerce.number().min(1, "Society is required"),
  routeCode: z.string().min(1, "Route is required"),
  shift: z.enum(["morning", "evening", "both"]),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  rateFormula: z.string().optional(),
  leadLoadAmount: z.coerce.number().optional(),
  status: z.enum(["draft", "issued", "paid"]).default("draft"),
});

type BillFormData = z.infer<typeof billSchema>;

export default function NewBill() {
  const [, navigate] = useLocation();
  const [bankOpen, setBankOpen] = useState(false);
  const queryClient = useQueryClient();
  const createBill = useCreateBill();
  const { data: societies } = useListSocieties();
  const { data: routes } = useListRoutes();

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      billDate: today,
      fromDate: firstOfMonth,
      toDate: today,
      shift: "both",
      status: "draft",
    },
  });

  const selectedSocietyId = watch("societyId");
  const selectedSociety = societies?.find(s => s.id === Number(selectedSocietyId));

  const onSubmit = (data: BillFormData) => {
    createBill.mutate(data, {
      onSuccess: (bill) => {
        queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
        navigate(`/bills/${bill.id}`);
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bills">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Bills
          </Button>
        </Link>
        <h2 className="text-lg font-semibold">Create New Bill</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bill Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="billNumber" className="text-sm font-medium">Bill Number <span className="text-destructive">*</span></Label>
              <Input id="billNumber" {...register("billNumber")} placeholder="MB-2026-001" />
              {errors.billNumber && <p className="text-xs text-destructive">{errors.billNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billDate" className="text-sm font-medium">Bill Date <span className="text-destructive">*</span></Label>
              <Input id="billDate" type="date" {...register("billDate")} />
              {errors.billDate && <p className="text-xs text-destructive">{errors.billDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fromDate" className="text-sm font-medium">From Date <span className="text-destructive">*</span></Label>
              <Input id="fromDate" type="date" {...register("fromDate")} />
              {errors.fromDate && <p className="text-xs text-destructive">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toDate" className="text-sm font-medium">To Date <span className="text-destructive">*</span></Label>
              <Input id="toDate" type="date" {...register("toDate")} />
              {errors.toDate && <p className="text-xs text-destructive">{errors.toDate.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Society & Route</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Society <span className="text-destructive">*</span></Label>
              <Select onValueChange={(val) => {
                setValue("societyId", parseInt(val));
                const s = societies?.find(s => s.id === parseInt(val));
                if (s) {
                  if (s.bankName) setValue("bankName", s.bankName);
                  if (s.bankAccount) setValue("bankAccount", s.bankAccount);
                  if (s.bankIfsc) setValue("bankIfsc", s.bankIfsc);
                  if (s.routeCode) setValue("routeCode", s.routeCode);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a society" />
                </SelectTrigger>
                <SelectContent>
                  {societies?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.societyId && <p className="text-xs text-destructive">{errors.societyId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Route Code <span className="text-destructive">*</span></Label>
              <Select onValueChange={(val) => setValue("routeCode", val)} defaultValue={selectedSociety?.routeCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes?.map((r) => (
                    <SelectItem key={r.id} value={r.code}>{r.code} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.routeCode && <p className="text-xs text-destructive">{errors.routeCode.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Shift</Label>
              <Select onValueChange={(val: "morning" | "evening" | "both") => setValue("shift", val)} defaultValue="both">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Rate Formula</Label>
              <Input {...register("rateFormula")} placeholder="FAT*0.30+SNF*0.25+0.50" />
            </div>
          </CardContent>
        </Card>

        <Collapsible open={bankOpen} onOpenChange={setBankOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Bank Details</CardTitle>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${bankOpen ? "rotate-180" : ""}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-2 gap-4 pt-0">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">Bank Name</Label>
                  <Input {...register("bankName")} placeholder="State Bank of India" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Account Number</Label>
                  <Input {...register("bankAccount")} placeholder="32456789012" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">IFSC Code</Label>
                  <Input {...register("bankIfsc")} placeholder="SBIN0001234" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select onValueChange={(val: "draft" | "issued" | "paid") => setValue("status", val)} defaultValue="draft">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/bills">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={createBill.isPending}
            className="bg-primary text-white hover:bg-primary/90 min-w-28"
          >
            {createBill.isPending ? "Creating..." : "Create Bill"}
          </Button>
        </div>
      </form>
    </div>
  );
}
