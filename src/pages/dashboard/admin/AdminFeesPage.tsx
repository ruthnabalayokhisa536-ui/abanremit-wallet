import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminFeesPage = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ flat_fee: "", percentage_fee: "", min_amount: "", max_amount: "" });

  const fetchFees = async () => {
    setLoading(true);
    const { data } = await supabase.from("fees").select("*").order("transaction_type");
    setFees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFees(); }, []);

  const startEdit = (fee: any) => {
    setEditing(fee.id);
    setEditForm({
      flat_fee: String(fee.flat_fee),
      percentage_fee: String(fee.percentage_fee),
      min_amount: String(fee.min_amount ?? ""),
      max_amount: String(fee.max_amount ?? ""),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("fees").update({
      flat_fee: Number(editForm.flat_fee),
      percentage_fee: Number(editForm.percentage_fee),
      min_amount: editForm.min_amount ? Number(editForm.min_amount) : null,
      max_amount: editForm.max_amount ? Number(editForm.max_amount) : null,
    }).eq("id", editing);
    if (error) { toast.error(error.message); return; }
    toast.success("Fee updated");
    setEditing(null);
    fetchFees();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Fees & Charges</h2>
        <p className="text-sm text-muted-foreground">All transaction charges are configurable from here.</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Transaction Type</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Flat Fee</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Percentage</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Min Amount</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Max Amount</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No fees configured. Add fees from the database.</td></tr>
                ) : fees.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium capitalize">{f.transaction_type}</td>
                    {editing === f.id ? (
                      <>
                        <td className="p-3 text-right"><Input type="number" value={editForm.flat_fee} onChange={(e) => setEditForm({...editForm, flat_fee: e.target.value})} className="w-20 h-7 text-xs text-right ml-auto" /></td>
                        <td className="p-3 text-right"><Input type="number" value={editForm.percentage_fee} onChange={(e) => setEditForm({...editForm, percentage_fee: e.target.value})} className="w-20 h-7 text-xs text-right ml-auto" /></td>
                        <td className="p-3 text-right"><Input type="number" value={editForm.min_amount} onChange={(e) => setEditForm({...editForm, min_amount: e.target.value})} className="w-24 h-7 text-xs text-right ml-auto" /></td>
                        <td className="p-3 text-right"><Input type="number" value={editForm.max_amount} onChange={(e) => setEditForm({...editForm, max_amount: e.target.value})} className="w-24 h-7 text-xs text-right ml-auto" /></td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" className="text-xs h-7" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditing(null)}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-right">{Number(f.flat_fee).toFixed(2)}</td>
                        <td className="p-3 text-right">{(Number(f.percentage_fee) * 100).toFixed(2)}%</td>
                        <td className="p-3 text-right text-muted-foreground">{f.min_amount != null ? Number(f.min_amount).toLocaleString() : "—"}</td>
                        <td className="p-3 text-right text-muted-foreground">{f.max_amount != null ? Number(f.max_amount).toLocaleString() : "—"}</td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => startEdit(f)}>Edit</Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFeesPage;
