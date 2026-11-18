/**
 * Requests behind the sale details dialog: reprint, cancel and void.
 *
 * Every call goes through `post()` below. If your API client sends the auth
 * token differently from what `post()` does, this is the only place to change.
 */

const TOKEN_KEYS = ["token", "authToken", "auth_token", "accessToken", "jwt"];

/** Best-effort lookup of the JWT when the app keeps it in browser storage. */
function readToken(): string | null {
    if (typeof window === "undefined") return null;

    for (const storage of [window.localStorage, window.sessionStorage]) {
        try {
            for (const key of TOKEN_KEYS) {
                const value = storage.getItem(key);
                if (value) return value.replace(/^"|"$/g, "");
            }
        } catch {
            // Storage can be blocked; fall through to cookie auth.
        }
    }

    return null;
}

async function post(url: string, body?: Record<string, unknown>) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body ?? {}),
    });

    const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
    };

    if (!response.ok || data.success === false) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

/** Sends the receipt of an existing sale to the store's printer. */
export async function reprintSale(saleId: string): Promise<void> {
    await post(`/api/print/reprint/${encodeURIComponent(saleId)}`);
}

/** Cancels a completed sale and returns its stock. */
export async function cancelSale(saleId: string, reason: string): Promise<void> {
    await post(`/api/sales/${encodeURIComponent(saleId)}/cancel`, { reason });
}

/** Voids a completed sale and returns its stock (admins only on the API). */
export async function voidSale(saleId: string, reason: string): Promise<void> {
    await post(`/api/sales/${encodeURIComponent(saleId)}/void`, { reason });
}