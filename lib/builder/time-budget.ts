export type BudgetResult = {
  totalUsed: number;
  remaining: number;
  fits: boolean;
  warning: string | null;
};

export function computeBudget(opts: {
  layoverMinutes: number;
  airportBufferMinutes: number;
  visitMinutes: number;
  travelMinutes: number;
}): BudgetResult {
  const { layoverMinutes, airportBufferMinutes, visitMinutes, travelMinutes } = opts;
  const available = layoverMinutes - airportBufferMinutes;
  const totalUsed = visitMinutes + travelMinutes;
  const remaining = available - totalUsed;
  const fits = remaining >= 0;

  let warning: string | null = null;
  if (!fits) {
    warning = `Over by ${Math.abs(remaining)} min — remove a stop or choose a shorter layover`;
  } else if (remaining < 15) {
    warning = `Very tight — only ${remaining} min buffer left`;
  } else if (remaining < 30) {
    warning = `Cutting it close — only ${remaining} min buffer`;
  }

  return { totalUsed, remaining, fits, warning };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
