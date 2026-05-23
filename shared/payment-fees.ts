export const AFTERPAY_FEE_RATE = 0.035;

export function applyAfterpayFee(amount: number): number {
  return Math.round(amount * (1 + AFTERPAY_FEE_RATE) * 100) / 100;
}
