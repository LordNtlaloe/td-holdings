// components/reports/PrintButton.tsx
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrintButtonProps {
    onPrint: () => void;
    className?: string;
    label?: string;
}

export function PrintButton({ onPrint, className, label = "Print" }: PrintButtonProps) {
    return (
        <Button variant="outline" onClick={onPrint} className={cn("", className)}>
            <Printer className="mr-2 h-4 w-4" />
            {label}
        </Button>
    );
}