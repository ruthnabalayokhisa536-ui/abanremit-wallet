import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AccountInfoProps {
  title: string;
  details: { label: string; value: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  amount?: string;
  fee?: string;
}

const AccountConfirmation: React.FC<AccountInfoProps> = ({ title, details, onConfirm, onCancel, amount, fee }) => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <Card className="p-4 space-y-3">
        {details.map((d, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-sm text-muted-foreground">{d.label}</span>
            <span className="text-sm font-medium text-foreground">{d.value}</span>
          </div>
        ))}
        {amount && (
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground">Amount</span>
            <span className="text-sm font-bold text-primary">KES {amount}</span>
          </div>
        )}
        {fee && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Transaction Fee</span>
            <span className="text-sm text-destructive">KES {fee}</span>
          </div>
        )}
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={onConfirm} className="flex-1">Confirm</Button>
      </div>
    </div>
  );
};

export default AccountConfirmation;
