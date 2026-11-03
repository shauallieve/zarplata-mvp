export type Expense = { id: string; label: string; amount: number; frequency: 'once' | 'daily' };
export type BudgetInput = { balance: number; payday: string; today: string; expenses: Expense[]; cuts: Record<string, number> };
export type BudgetResult = { days: number; fixed: number; daily: number; available: number; baselineProjected: number; projected: number; allowance: number; runwayDays: number | null; reduction: number; dailyAfterCuts: number; expenseTotal: number; hasDeficit: boolean };
export const safeMoney = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(1_000_000_000, Math.max(0, n)) : 0;
};
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function dateAfter(days: number, base = new Date()): string {
  const d = new Date(base.getFullYear(),base.getMonth(),base.getDate()+days);
  return isoLocalDate(d);
}
export function daysBetween(today: string, payday: string): number {
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${payday}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0,Math.min(366,Math.round((b-a)/86400000)));
}
export function calculate(input: BudgetInput): BudgetResult {
  const days = daysBetween(input.today, input.payday);
  const balance = safeMoney(input.balance);
  let fixed=0, daily=0, dailyAfterCuts=0;
  for (const expense of input.expenses) {
    const amount = safeMoney(expense.amount);
    const cut = Math.min(100, Math.max(0, Number(input.cuts[expense.id]) || 0));
    if (expense.frequency === 'once') fixed += amount;
    else { daily += amount; dailyAfterCuts += amount * (1-cut/100); }
  }
  const available = balance - fixed;
  const baselineProjected = available - daily*days;
  const projected = available - dailyAfterCuts*days;
  const reduction = (daily-dailyAfterCuts)*days;
  const runwayDays = available < 0 ? 0 : dailyAfterCuts <= 0 ? null : Math.floor(available/dailyAfterCuts);
  return {days,fixed,daily,available,baselineProjected,projected,allowance:days>0?Math.max(0,available/days):0,runwayDays,reduction,dailyAfterCuts,expenseTotal:fixed+daily*days,hasDeficit:projected<0};
}
export const currency = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;
export function insight(r: BudgetResult): string {
  if (r.days===0) return 'Выберите будущую дату выплаты, чтобы получить прогноз.';
  if (r.available<0) return 'Обязательные платежи уже превышают доступный остаток.';
  if (r.hasDeficit) return `При текущем темпе не хватит ${currency(-r.projected)} до выплаты. Попробуйте уменьшить ежедневные траты.`;
  if (r.projected===0) return 'Бюджет сойдётся в ноль. Лучше оставить небольшой резерв на непредвиденные расходы.';
  return `По вашему плану к выплате останется ${currency(r.projected)}. Это прогноз, не гарантия.`;
}
