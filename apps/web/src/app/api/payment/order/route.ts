import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { APPLY_MODE_PAISE, createOrder } from "@/lib/razorpay";

// Creates the ₹99 Apply Mode order. The amount is NOT taken from the request —
// it is a server constant, so there is nothing for a client to under-pay.
export async function POST(request: Request) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { opportunity_id?: string };
  const receipt = `apply_${(body.opportunity_id ?? "any").slice(0, 12)}_${Date.now()}`;

  try {
    const order = await createOrder(receipt);
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    console.error("[payment/order]", err);
    // 401 here is OUR credentials failing at Razorpay, not the caller's session.
    if (status === 401) {
      return NextResponse.json({ error: "Payment gateway rejected our credentials." }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ amount: APPLY_MODE_PAISE, currency: "INR" });
}
