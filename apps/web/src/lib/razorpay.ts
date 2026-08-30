import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay Standard Checkout, server side. Two REST calls and one HMAC — the
// `razorpay` npm package wraps exactly that, so we use fetch + node:crypto
// instead of taking the dependency.
//
// KEY_SECRET is read here and nowhere else. The browser only ever sees
// NEXT_PUBLIC_RAZORPAY_KEY_ID, which is public by design.

/** Apply Mode is ₹99 flat. The price lives on the server so a tampered client
 *  cannot ask for an order of ₹1. */
export const APPLY_MODE_PAISE = 9900;

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

function credentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  }
  return { keyId, keySecret };
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates an order at Razorpay. Throws on any non-2xx so the route can map it. */
export async function createOrder(receipt: string): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  const res = await fetch(ORDERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: APPLY_MODE_PAISE,
      currency: "INR",
      // Razorpay caps receipt at 40 chars.
      receipt: receipt.slice(0, 40),
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { id?: string; amount?: number; currency?: string; error?: { description?: string } }
    | null;

  if (!res.ok || !body?.id) {
    const detail = body?.error?.description ?? `HTTP ${res.status}`;
    // 401 from Razorpay means our own keys are wrong — surfaced separately by
    // the route so a misconfiguration is not reported as "payment failed".
    const err = new Error(`Razorpay order creation failed: ${detail}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  return { id: body.id, amount: body.amount ?? APPLY_MODE_PAISE, currency: body.currency ?? "INR" };
}

/**
 * Razorpay's checkout signature: HMAC-SHA256("<order_id>|<payment_id>", secret).
 * Constant-time compare — a byte-by-byte `===` on a signature leaks timing.
 */
export function isValidPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const given = Buffer.from(signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  return given.length === mine.length && timingSafeEqual(given, mine);
}
