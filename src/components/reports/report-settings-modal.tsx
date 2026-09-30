// components/reports/ReportSettingsModal.tsx
import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ReportSettings {
    showSummaryCards: boolean;
    showCharts: boolean;
    showTable: boolean;
    dateFormat: string;
    currencyFormat: string;
}

interface ReportSettingsModalProps {
    settings: ReportSettings;
    onSettingsChange: (settings: ReportSettings) => void;
    trigger?: React.ReactNode;
    className?: string;
}

export function ReportSettingsModal({
    settings,
    onSettingsChange,
    trigger,
    className,
}: ReportSettingsModalProps) {
    const [localSettings, setLocalSettings] = React.useState(settings);
    const [open, setOpen] = React.useState(false);

    const handleSave = () => {
        onSettingsChange(localSettings);
        setOpen(false);
    };

    const handleReset = () => {
        const defaultSettings: ReportSettings = {
            showSummaryCards: true,
            showCharts: true,
            showTable: true,
            dateFormat: "MM/DD/YYYY",
            currencyFormat: "LSL",
        };
        setLocalSettings(defaultSettings);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className={cn("", className)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Report Settings</DialogTitle>
                    <DialogDescription>
                        Customize how the report is displayed.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Display Options</h4>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-summary">Show Summary Cards</Label>
                            <Switch
                                id="show-summary"
                                checked={localSettings.showSummaryCards}
                                onCheckedChange={(checked) =>
                                    setLocalSettings({ ...localSettings, showSummaryCards: checked })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-charts">Show Charts</Label>
                            <Switch
                                id="show-charts"
                                checked={localSettings.showCharts}
                                onCheckedChange={(checked) =>
                                    setLocalSettings({ ...localSettings, showCharts: checked })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-table">Show Table</Label>
                            <Switch
                                id="show-table"
                                checked={localSettings.showTable}
                                onCheckedChange={(checked) =>
                                    setLocalSettings({ ...localSettings, showTable: checked })
                                }
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Formatting</h4>
                        <div className="space-y-2">
                            <Label htmlFor="date-format">Date Format</Label>
                            <Select
                                value={localSettings.dateFormat}
                                onValueChange={(value) =>
                                    setLocalSettings({ ...localSettings, dateFormat: value })
                                }
                            >
                                <SelectTrigger id="date-format">
                                    <SelectValue placeholder="Select date format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency-format">Currency</Label>
                            <Select
                                value={localSettings.currencyFormat}
                                onValueChange={(value) =>
                                    setLocalSettings({ ...localSettings, currencyFormat: value })
                                }
                            >
                                <SelectTrigger id="currency-format">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LSL">LSL (Lesotho Loti)</SelectItem>
                                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between">
                    <Button variant="outline" onClick={handleReset}>
                        Reset to Defaults
                    </Button>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}