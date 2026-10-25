/**
 * Global Currency Utility for OmniPOS
 * Standardizes Sri Lankan Rupee (Rs. / LKR) formatting across all terminals, kiosks, and dashboards.
 */

export const DEFAULT_CURRENCY = 'LKR';
export const DEFAULT_CURRENCY_SYMBOL = 'Rs.';

export interface FormatCurrencyOptions {
  symbol?: string;
  showDecimals?: boolean;
  minDecimals?: number;
  maxDecimals?: number;
}

/**
 * Formats a numeric amount or string number as Sri Lankan Rupees.
 * Examples:
 *   formatCurrency(1500)     => "Rs. 1,500.00"
 *   formatCurrency(49.5)     => "Rs. 49.50"
 *   formatCurrency(0)        => "Rs. 0.00"
 *   formatCurrency(1500, { showDecimals: false }) => "Rs. 1,500"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = options?.symbol ?? DEFAULT_CURRENCY_SYMBOL;
  const showDecimals = options?.showDecimals ?? true;
  const minDecimals = options?.minDecimals ?? (showDecimals ? 2 : 0);
  const maxDecimals = options?.maxDecimals ?? (showDecimals ? 2 : 0);

  const formattedNumber = numeric.toLocaleString('en-LK', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return `${symbol} ${formattedNumber}`;
}

/**
 * Returns raw comma-separated number string without currency symbol.
 * Example: formatAmount(1500) => "1,500.00"
 */
export function formatAmount(
  amount: number | string | null | undefined,
  options?: Omit<FormatCurrencyOptions, 'symbol'>
): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount) || 0;
  const showDecimals = options?.showDecimals ?? true;
  const minDecimals = options?.minDecimals ?? (showDecimals ? 2 : 0);
  const maxDecimals = options?.maxDecimals ?? (showDecimals ? 2 : 0);

  return numeric.toLocaleString('en-LK', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}
