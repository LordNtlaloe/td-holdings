import { createFileRoute } from "@tanstack/react-router";
import { useApiQuery, useApiMutation } from '#/lib/api/hooks';
import api from '#/lib/api/client';
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "sonner";
import { Loader2, Printer, CheckCircle, XCircle } from "lucide-react";
import AppLayout from "#/layouts/app-layout";

export const Route = createFileRoute("/dashboard/stores/settings/")({
  component: StoreSettingsComponent,
});

interface StoreWithAgent {
  _id: string;
  name: string;
  printAgentId: string | null;
  isActive: boolean;
  phone: string;
  address: string | null;
}

/** Mirrors `LEGACY_AGENT_ID` on the server: values left behind by the old
 * till-relay are UUIDs, not printer addresses. */
const LEGACY_AGENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isLegacyAgentId = (value: string | null | undefined) =>
  !!value && LEGACY_AGENT_ID.test(value.trim());

function StoreSettingsComponent() {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [agentId, setAgentId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: stores } = useApiQuery<any>('stores.getAllStoresWithPrintAgents', '/api/stores/with-print-agents');
  // Printers CUPS already knows about on the server host, offered as one-click
  // suggestions so the queue name does not have to be guessed.
  const { data: cupsQueues } = useApiQuery<any>('print.cupsQueues', '/api/print/cups-queues');

  // Use mutation for updating the agent ID (database operation)
  const updatePrintAgent = useApiMutation('stores.updatePrintAgentId', 'PATCH', '/api/stores/print-agent', ['stores.getAllStoresWithPrintAgents']);

  const selectedStore = stores?.find((s: StoreWithAgent) => s._id === selectedStoreId);

  const handleUpdateAgent = async () => {
    if (!selectedStoreId || !agentId.trim()) {
      toast.error("Please select a store and enter a printer address");
      return;
    }

    setIsUpdating(true);
    try {
      await updatePrintAgent({
        storeId: selectedStoreId as any,
        agentId: agentId.trim(),
      });
      toast.success("Printer address updated successfully!");
      setTestResult(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update agent ID"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedStoreId) {
      toast.error("Please select a store first");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      // Goes through the shared API client so the auth token is attached; a raw
      // fetch here is what caused the "not authenticated" error.
      const result = await api.post<{
        success: boolean;
        error?: string;
        detail?: string;
        target?: string;
      }>('/api/stores/test-print-connection', {
        storeId: selectedStoreId,
        // Probe the address currently in the box, so it can be verified before
        // it is saved.
        agentId: agentId.trim() || undefined,
      });
      setTestResult({
        success: result.success,
        message: result.success
          ? `Printer is reachable (${result.target ?? "target accepted"})`
          : result.error || "Connection failed",
      });
      if (result.success) {
        toast.success("Printer connection test successful!");
      } else {
        toast.error(result.error || "Printer connection test failed");
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to test connection"
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Store Printer Settings</h1>
            <p className="text-muted-foreground">
              Configure which printer each store uses for receipts
            </p>
          </div>
          <Printer className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure Receipt Printer</CardTitle>
            <CardDescription>
              Set the printer each store sends receipts to. Use an IP address and
              port for a network printer, or a device path for a USB one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Store</Label>
              <Select
                value={selectedStoreId}
                onValueChange={(value: string) => {
                  setSelectedStoreId(value);
                  const store = stores?.find((s: StoreWithAgent) => s._id === value);
                  // Never copy a legacy agent id into the input: it looks like a
                  // valid setting but can never print, so start from empty.
                  setAgentId(
                    isLegacyAgentId(store?.printAgentId)
                      ? ""
                      : store?.printAgentId || ""
                  );
                  setTestResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a store..." />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((store: StoreWithAgent) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name} {!store.isActive && "(Inactive)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStore && (
              <>
                <div className="space-y-2">
                  <Label>Current Printer Address</Label>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                    {selectedStore.printAgentId || "Not configured"}
                  </div>
                  {isLegacyAgentId(selectedStore.printAgentId) && (
                    <p className="text-sm text-amber-600">
                      This is a legacy agent ID from the old till relay, not a
                      printer address, so receipts cannot be sent to it. Replace
                      it with the printer's IP:port or device path.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>New Printer Address</Label>
                  <Input
                    placeholder="e.g. 192.168.1.50:9100 or /dev/usb/lp0"
                    value={agentId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAgentId(e.target.value)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave this empty to clear the setting. Network thermal
                    printers usually listen on port 9100.
                  </p>
                  {cupsQueues?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-sm text-muted-foreground">
                        Printers found on the server:
                      </span>
                      {cupsQueues.map((queue: string) => (
                        <Button
                          key={queue}
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAgentId(`cups:${queue}`);
                            setTestResult(null);
                          }}
                        >
                          cups:{queue}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleUpdateAgent}
                    disabled={isUpdating || !agentId.trim()}
                    className="flex-1"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Printer Address"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={
                      isTesting ||
                      (!agentId.trim() && !selectedStore.printAgentId)
                    }
                    className="flex-1"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-md flex items-center gap-2 ${
                      testResult.success
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Finding your printer address</CardTitle>
            <CardDescription>
              Receipts are sent straight from the server to the printer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">Network printer</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Print the printer's self-test page to get its IP address</li>
              <li>
                Enter it as <span className="font-mono">IP:port</span>, for
                example <span className="font-mono">192.168.1.50:9100</span>
              </li>
              <li>
                Give the printer a static IP (or DHCP reservation) so it does not
                move
              </li>
              <li>Click Save, then Test Connection</li>
            </ol>
            <div className="mt-4">
              <p className="font-medium">USB printer</p>
              <p className="text-muted-foreground mt-1">
                If the printer is already set up in CUPS, use{" "}
                <span className="font-mono">cups:QUEUE</span> — for example{" "}
                <span className="font-mono">cups:POS-80</span>. CUPS owns the
                device, so the server needs no extra permissions.
              </p>
              <p className="text-muted-foreground mt-1">
                To write to the device directly instead, find the path with{" "}
                <span className="font-mono">ls /dev/usb/lp*</span> (for example{" "}
                <span className="font-mono">/dev/usb/lp0</span>). The user running
                the server must be in the <span className="font-mono">lp</span>{" "}
                group, otherwise this fails with "permission denied".
              </p>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="font-medium">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
                <li>
                  The server must be able to reach the printer over the network —
                  check the IP and that port 9100 is not blocked
                </li>
                <li>
                  A UUID here means a legacy agent ID from the old till relay; it
                  will never print and needs replacing
                </li>
                <li>
                  Receipts default to 58mm text width (32 columns). An 80mm
                  printer will still work but leaves the right side unused
                </li>
                <li>Use the "Test Connection" button to verify connectivity</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}