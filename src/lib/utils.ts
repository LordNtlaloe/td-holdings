import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const moneyFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "LSL",
  minimumFractionDigits: 2,
})

export function formatMoney(n: number) {
  return moneyFmt.format(Number(n) || 0)
}
