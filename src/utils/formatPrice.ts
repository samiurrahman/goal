// src/utils/formatPrice.ts

export function formatPrice(
  price: number | null | undefined,
  currency: string = "USD"
): string {
  if (price == null || isNaN(Number(price))) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(price));
}
