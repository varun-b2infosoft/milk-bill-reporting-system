import { useState } from "react";
import { Link } from "wouter";
import { useListBills, useDeleteBill, useListSocieties, useListRoutes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatQuantity, formatDate, getStatusColor } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getListBillsQueryKey } from "@workspace/api-client-react";

export default function BillsList() {
  const [page, setPage] = useState(1);
  const [societyId, setSocietyId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const params = {
    page,
    limit: 15,
    ...(societyId && societyId !== "all" ? { societyId: parseInt(societyId) } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const { data, isLoading } = useListBills(params, {
    query: { queryKey: getListBillsQueryKey(params) },
  });
  const { data: societies } = useListSocieties();
  const deleteMutation = useDeleteBill();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
        setDeleteId(null);
      },
    });
  };

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Milk Bills</h2>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} bills total</p>
        </div>
        <Link href="/bills/new">
          <Button className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Society</label>
              <Select value={societyId} onValueChange={setSocietyId}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="All Societies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Societies</SelectItem>
                  {societies?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSocietyId(""); setFromDate(""); setToDate(""); setPage(1); }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Bill No</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Society</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Quantity</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Payable</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((bill) => (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-primary">{bill.billNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(bill.billDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{bill.societyName}</p>
                          <p className="text-xs text-muted-foreground">{bill.societyCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatQuantity(bill.totalQuantity)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(bill.totalAmount)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(bill.finalPayable)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(bill.status)} className="capitalize text-xs">
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/bills/${bill.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(bill.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      No bills found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} — {data?.total} bills
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bill and all associated milk entries and deductions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
