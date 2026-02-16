import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminCurrenciesPage = () => {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "" });
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({ buy_rate: "", sell_rate: "", admin_fee_percentage: "" });

  const fetchCurrencies = async () => {
    setLoading(true);
    const { data } = await supabase.from("currencies").select("*").order("code");
    setCurrencies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCurrencies(); }, []);

  const handleAdd = async () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) { toast.error("All fields required"); return; }
    const { error } = await supabase.from("currencies").insert(newCurrency as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Currency added");
    setNewCurrency({ code: "", name: "", symbol: "" });
    setAdding(false);
    fetchCurrencies();
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("currencies").update({ enabled: !enabled }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchCurrencies();
  };

  const setDefault = async (id: string) => {
    await supabase.from("currencies").update({ is_default: false }).neq("id", id);
    await supabase.from("currencies").update({ is_default: true }).eq("id", id);
    toast.success("Default currency updated");
    fetchCurrencies();
  };

  const openRateEditor = (currency: any) => {
    setEditingRate(currency.id);
    setRateForm({
      buy_rate: currency.buy_rate?.toString() || "1.0",
      sell_rate: currency.sell_rate?.toString() || "1.0",
      admin_fee_percentage: currency.admin_fee_percentage?.toString() || "0.0"
    });
  };

  const saveRates = async () => {
    if (!editingRate) return;
    const updateData: any = {
      exchange_rate: parseFloat(rateForm.buy_rate),
    };
    const { error } = await supabase.from("currencies").update(updateData).eq("id", editingRate);
    if (error) { toast.error(error.message); return; }
    toast.success("Exchange rates updated");
    setEditingRate(null);
    fetchCurrencies();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Currency Management</h2>
          <Button size="sm" onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "Add Currency"}</Button>
        </div>

        {adding && (
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Code (KES)" value={newCurrency.code} onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} />
              <Input placeholder="Name (Kenyan Shilling)" value={newCurrency.name} onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})} />
              <Input placeholder="Symbol (KES)" value={newCurrency.symbol} onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})} />
            </div>
            <Button onClick={handleAdd}>Save</Button>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Symbol</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Exchange Rate</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Default</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="p-3 font-mono font-medium">{c.code}</td>
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.symbol}</td>
                      <td className="p-3 text-right font-mono text-sm">{c.exchange_rate?.toFixed(4) || "1.0000"}</td>
                      <td className="p-3 text-center">{c.is_default ? <Badge className="text-xs">Default</Badge> : "—"}</td>
                      <td className="p-3 text-center">
                        <Badge variant={c.enabled ? "default" : "secondary"} className="text-xs">{c.enabled ? "Enabled" : "Disabled"}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openRateEditor(c)}>Edit Rate</Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toggleEnabled(c.id, c.enabled)}>{c.enabled ? "Disable" : "Enable"}</Button>
                          {!c.is_default && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDefault(c.id)}>Set Default</Button>}
                        </div>
                      </td>
                    </tr>
                    {editingRate === c.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={7} className="p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Edit Exchange Rate for {c.code}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Exchange Rate</label>
                                <Input type="number" step="0.0001" value={rateForm.buy_rate} onChange={(e) => setRateForm({...rateForm, buy_rate: e.target.value})} className="mt-1" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveRates}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingRate(null)}>Cancel</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCurrenciesPage;
