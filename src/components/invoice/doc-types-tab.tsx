import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";

export type DocType = "quotation" | "proforma" | "invoice";

interface DocTypeTabsProps {
  value: DocType;
  onChange: (value: DocType) => void;
}

export function DocTypeTabs({ value, onChange }: DocTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DocType)}>
      <TabsList>
        <TabsTrigger value="quotation">Quotation</TabsTrigger>
        <TabsTrigger value="proforma">Proforma Invoice</TabsTrigger>
        <TabsTrigger value="invoice">Invoice</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}