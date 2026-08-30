/** "50000" -> "₹50,000" */
export function inr(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/** "250000" -> "₹2.5L", "528389800" -> "₹52.8Cr" */
export function inrCompact(amount: number): string {
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `₹${Number.isInteger(crore) ? crore : crore.toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return inr(amount);
}

export function cgpa(value: number): string {
  return value.toFixed(1);
}