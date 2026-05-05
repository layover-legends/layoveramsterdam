/** Currency types safe to import from both server and client files. */

export type FxRate = {
  currency_code: string;
  rate_to_eur: number;
  symbol: string;
  symbol_position: "before" | "after";
  decimals: number;
};
