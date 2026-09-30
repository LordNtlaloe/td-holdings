/**
 * Delivery of ESC/POS bytes to a thermal printer.
 *
 * A store's `print_agent_id` holds the printer address. Supported forms:
 *   - `192.168.1.50` or `192.168.1.50:9100` or `tcp://192.168.1.50:9100`
 *     → raw TCP (port 9100 is the de-facto standard for network receipt printers)
 *   - `/dev/usb/lp0` or `file:/dev/usb/lp0` → write the bytes to a device/file
 *   - `cups:POS-80` or `cups://POS-80` → hand the bytes to a local CUPS queue.
 *     Preferred for USB printers: CUPS owns the device node, so the server does
 *     not need membership of the `lp` group.
 *   - empty, `none` or `dry-run` → generate the bytes but send nothing, so the
 *     receipt can be inspected without hardware.
 */

import { connect } from "node:net";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, writeFile } from "node:fs/promises";

export type PrintTransport = "tcp" | "device" | "cups" | "dry-run";

type RawTarget = { raw: string };

export type PrintTarget =
  | ({ transport: "tcp"; host: string; port: number } & RawTarget)
  | ({ transport: "device"; path: string } & RawTarget)
  | ({ transport: "cups"; queue: string } & RawTarget)
  | ({ transport: "legacy-agent"; agentId: string } & RawTarget)
  | ({ transport: "dry-run" } & RawTarget);

/**
 * The migrated Convex data stored an *agent* id per store, not a printer
 * address — every value looks like a UUID. Sending bytes there fails with an
 * opaque DNS error, so it is detected and reported as a configuration problem
 * instead.
 */
const LEGACY_AGENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_TCP_PORT = 9100;
const DEFAULT_TIMEOUT_MS = 5000;

export function parsePrintTarget(configured?: string | null): PrintTarget {
  const value = (configured ?? "").trim();
  if (!value || /^(dry-run|none|null)$/i.test(value)) {
    return { transport: "dry-run", raw: value };
  }
  if (value.startsWith("/")) {
    return { transport: "device", path: value, raw: value };
  }
  if (/^file:/i.test(value)) {
    return { transport: "device", path: value.replace(/^file:(\/\/)?/i, "/"), raw: value };
  }
  // CUPS queue, e.g. `cups:POS-80` or `cups://POS-80`.
  const cups = value.match(/^cups:(\/\/)?(.+)$/i);
  if (cups) {
    const queue = cups[2].trim().replace(/\/+$/, "");
    return queue
      ? { transport: "cups", queue, raw: value }
      : { transport: "dry-run", raw: value };
  }

  const withoutScheme = value.replace(/^tcp:\/\//i, "");
  const [host, port] = withoutScheme.split(":");
  // A bare ":9100" has no host to reach — fall back to dry-run.
  if (!host) return { transport: "dry-run", raw: value };
  if (LEGACY_AGENT_ID.test(host)) {
    return { transport: "legacy-agent", agentId: host, raw: value };
  }

  return {
    transport: "tcp",
    host,
    port: port ? Number(port) : DEFAULT_TCP_PORT,
    raw: value,
  };
}

export function describeTarget(target: PrintTarget): string {
  if (target.transport === "tcp") return `tcp://${target.host}:${target.port}`;
  if (target.transport === "device") return target.path;
  if (target.transport === "cups") return `cups://${target.queue}`;
  if (target.transport === "legacy-agent") return `legacy agent id ${target.agentId}`;
  return "dry-run (not sent)";
}

/**
 * Runs a CUPS utility and collects its output. Uses `spawn` with an argument
 * array rather than a shell, so a queue name can never be read as shell syntax.
 */
function runCups(
  command: string,
  args: string[],
  data: Buffer | null,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [data ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) return resolve(stdout);
      const reason = stderr.trim() ? `: ${stderr.trim()}` : "";
      reject(new Error(`${command} exited with code ${code}${reason}`));
    });

    if (data) child.stdin?.end(data);
  });
}

/** Names of the CUPS queues configured on this machine. */
export async function listCupsQueues(): Promise<string[]> {
  try {
    const stdout = await runCups("lpstat", ["-p"], null);
    return stdout
      .split("\n")
      .map((line) => line.match(/^printer\s+(\S+)/)?.[1])
      .filter((name): name is string => !!name);
  } catch {
    // No CUPS installed or the daemon is down — not an error for the caller.
    return [];
  }
}

export interface PrintResult {
  sent: boolean;
  target: PrintTarget;
  bytes: number;
  detail: string;
}

/** Send the byte stream. Dry-run reports success without touching a device. */
export async function sendToPrinter(
  target: PrintTarget,
  data: Buffer,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<PrintResult> {
  if (target.transport === "dry-run") {
    return {
      sent: false,
      target,
      bytes: data.length,
      detail: "Dry run — receipt generated but not sent (no printer configured)",
    };
  }

  if (target.transport === "legacy-agent") {
    return {
      sent: false,
      target,
      bytes: data.length,
      detail:
        `This store still holds a legacy agent id (${target.agentId}) rather than a printer ` +
        "address. Set an IP:port (e.g. 192.168.1.50:9100) or a device path in Store Printer Settings.",
    };
  }

  if (target.transport === "cups") {
    // CUPS owns the USB device node, so this works without `lp` group access.
    await runCups("lp", ["-d", target.queue, "-o", "raw", "-"], data, timeoutMs);
    return {
      sent: true,
      target,
      bytes: data.length,
      detail: `Queued ${data.length} bytes to CUPS printer "${target.queue}"`,
    };
  }

  if (target.transport === "device") {
    await writeFile(target.path, data);
    return {
      sent: true,
      target,
      bytes: data.length,
      detail: `Wrote ${data.length} bytes to ${target.path}`,
    };
  }

  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host: target.host, port: target.port });
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error(`Timed out after ${timeoutMs}ms connecting to ${describeTarget(target)}`));
    }, timeoutMs);

    socket.once("connect", () => {
      socket.write(data, () => socket.end());
    });
    socket.once("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });
  });

  return {
    sent: true,
    target,
    bytes: data.length,
    detail: `Sent ${data.length} bytes to ${describeTarget(target)}`,
  };
}

/** Reachability probe used by the store settings "test connection" button. */
export async function testPrinterTarget(
  target: PrintTarget,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ ok: boolean; detail: string }> {
  if (target.transport === "dry-run") {
    return { ok: true, detail: "No printer address configured — receipts will be generated but not sent" };
  }

  if (target.transport === "legacy-agent") {
    return {
      ok: false,
      detail:
        `Store holds a legacy agent id (${target.agentId}), not a printer address. ` +
        "Set an IP:port (e.g. 192.168.1.50:9100) or a device path such as /dev/usb/lp0.",
    };
  }

  if (target.transport === "cups") {
    try {
      const status = await runCups("lpstat", ["-p", target.queue], null, timeoutMs);
      return { ok: true, detail: status.trim() || `CUPS queue "${target.queue}" is available` };
    } catch (error: any) {
      return {
        ok: false,
        detail:
          `CUPS queue "${target.queue}" is not available (${error.message}). ` +
          "List the configured queues with `lpstat -p`.",
      };
    }
  }

  if (target.transport === "device") {
    try {
      await access(target.path, constants.W_OK);
      return { ok: true, detail: `${target.path} is writable` };
    } catch (error: any) {
      return {
        ok: false,
        detail:
          `${target.path} is not writable (${error.message}). ` +
          "Either add your user to the `lp` group, or point the store at the CUPS " +
          'queue instead (e.g. "cups:POS-80").',
      };
    }
  }

  return new Promise((resolve) => {
    const socket = connect({ host: target.host, port: target.port });
    let settled = false;

    const finish = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok, detail });
    };

    const timer = setTimeout(
      () => finish(false, `Timed out after ${timeoutMs}ms reaching ${describeTarget(target)}`),
      timeoutMs
    );

    socket.once("connect", () => finish(true, `Connected to ${describeTarget(target)}`));
    socket.once("error", (error) => finish(false, error.message));
  });
}
