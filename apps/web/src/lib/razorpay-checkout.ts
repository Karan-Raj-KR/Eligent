"use client";

// Minimal typing + loader for Razorpay's Standard Checkout script. Loaded on
// demand from the Apply Mode gate rather than in the root layout, so the other
// pages never fetch it.

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface CheckoutHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  handler: (response: CheckoutHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => RazorpayInstance;
  }
}

/** Resolves once window.Razorpay exists. Rejects if the script can't load. */
export function loadCheckout(): Promise<NonNullable<Window["Razorpay"]>> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () =>
      window.Razorpay
        ? resolve(window.Razorpay)
        : reject(new Error("Razorpay checkout loaded but did not initialise"));

    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout")), {
      once: true,
    });

    if (!existing) {
      script.src = SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}
