import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Download } from "lucide-react";

interface ReceiptItem {
  label: string;
  value: string;
}

interface ReceiptScreenProps {
  title: string;
  items: ReceiptItem[];
  onDone: () => void;
  message?: string;
}

const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ title, items, onDone, message }) => {
  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    // Placeholder for PDF generation
    const text = `ABANREMIT RECEIPT\n${title}\n${"=".repeat(40)}\n${items.map(i => `${i.label}: ${i.value}`).join("\n")}\n${"=".repeat(40)}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AbanRemit_Receipt_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-success" />
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      {message && (
        <p className="text-sm text-muted-foreground text-center max-w-sm bg-muted p-3 rounded-lg">{message}</p>
      )}
      <div className="w-full max-w-sm border border-border rounded-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-bold">
          ABANREMIT
        </div>
        {items.map((item, i) => (
          <div key={i} className={`flex justify-between px-4 py-3 ${i % 2 === 0 ? "bg-card" : "bg-muted/50"}`}>
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 w-full max-w-sm">
        <Button variant="outline" onClick={handlePrint} className="flex-1 gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} className="flex-1 gap-2">
          <Download className="w-4 h-4" /> Download
        </Button>
      </div>
      <Button onClick={onDone} className="w-full max-w-sm">Done</Button>
    </div>
  );
};

export default ReceiptScreen;
