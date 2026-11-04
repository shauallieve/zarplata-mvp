export const MAX_MONEY = 100_000_000_000; // tiyn; max 1 billion KZT per entry
export const CATEGORIES = [
  { id: "food", name: "Продукты", color: "#b4e7a7" },
  { id: "cafe", name: "Кафе и рестораны", color: "#b8acdf" },
  { id: "delivery", name: "Доставка еды", color: "#e6be8e" },
  { id: "transport", name: "Такси и транспорт", color: "#8bc9d1" },
  { id: "credit", name: "Кредиты и рассрочки", color: "#db9995" },
  { id: "home", name: "Аренда и коммунальные", color: "#89ac89" },
  { id: "fun", name: "Развлечения", color: "#cfb5cf" },
  { id: "shopping", name: "Покупки", color: "#b2b8df" },
  { id: "subscriptions", name: "Подписки", color: "#c7d58d" },
  { id: "other", name: "Прочее", color: "#96a29c" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];
export type Frequency = "monthly" | "twice" | "weekly" | "custom";
export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: "expense" | "income";
  category: Category;
  note: string;
  required: boolean;
  obligationId?: string;
};
export type Obligation = {
  id: string;
  name: string;
  amount: number;
  due: string;
  category: Category;
  kind: "bill" | "debt";
  total: number;
  paidTxId?: string;
};
export type FinanceState = {
  version: 1;
  salary: number;
  lastPay: string;
  nextPay: string;
  frequency: Frequency;
  opening: {
    amount: number | null;
    date: string;
    excludedIds: string[];
    estimated: boolean;
  };
  daily: number | null;
  trackingSince: string;
  obligations: Obligation[];
  transactions: Transaction[];
  revision: number;
};
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === v;
}
export function dayDiff(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function addMonths(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function nextDate(date: string, f: Frequency) {
  return f === "weekly"
    ? addDays(date, 7)
    : f === "twice"
      ? addDays(date, 15)
      : addMonths(date, 1);
}
export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function money(v: number | null, compact = false) {
  if (v === null) return "—";
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: compact ? 0 : 2,
      minimumFractionDigits: 0,
      notation: compact ? "compact" : "standard",
    }).format(v / 100) + " ₸"
  );
}
export function dateLabel(d: string, long = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: long ? "long" : "short",
  }).format(new Date(d + "T12:00:00"));
}
export function parseMoney(
  raw: string,
  { negative = false, zero = true } = {},
) {
  const clean = raw.replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean))
    throw new Error("Введите сумму с точностью до двух знаков.");
  const value = Math.round(Number(clean) * 100);
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(value) > MAX_MONEY ||
    (!negative && value < 0) ||
    (!zero && value === 0)
  )
    throw new Error(
      "Проверьте сумму: от " + (zero ? "0" : "0,01") + " до 1 млрд ₸.",
    );
  return value;
}
export const categoryName = (id: Category) =>
  CATEGORIES.find((c) => c.id === id)?.name ?? "Прочее";
export function blankState(today = todayISO()): FinanceState {
  return {
    version: 1,
    salary: 0,
    lastPay: today,
    nextPay: addMonths(today, 1),
    frequency: "monthly",
    opening: { amount: null, date: today, excludedIds: [], estimated: false },
    daily: null,
    trackingSince: today,
    obligations: [],
    transactions: [],
    revision: 0,
  };
}
export function balance(s: FinanceState, today = todayISO()) {
  if (s.opening.amount === null) return null;
  return s.transactions
    .filter(
      (t) =>
        t.date >= s.opening.date &&
        t.date <= today &&
        !s.opening.excludedIds.includes(t.id),
    )
    .reduce(
      (n, t) => n + (t.type === "income" ? t.amount : -t.amount),
      s.opening.amount,
    );
}
export function pending(s: FinanceState, today = todayISO()) {
  return s.obligations
    .filter((o) => !o.paidTxId && o.due < s.nextPay)
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function dailyRate(s: FinanceState, today = todayISO()) {
  if (s.daily !== null)
    return { value: s.daily, source: "manual" as const, days: 0 };
  const days = dayDiff(s.trackingSince, today);
  if (days < 3) return { value: null, source: "missing" as const, days };
  const recorded = s.transactions.filter(
    (t) =>
      t.type === "expense" &&
      !t.required &&
      t.date >= s.trackingSince &&
      t.date < today,
  );
  if (!recorded.length)
    return { value: null, source: "missing" as const, days };
  const total = recorded.reduce((n, t) => n + t.amount, 0);
  return { value: Math.round(total / days), source: "history" as const, days };
}
export function forecast(
  s: FinanceState,
  today = todayISO(),
  overrideDaily?: number,
) {
  const current = balance(s, today),
    days = Math.max(0, dayDiff(today, s.nextPay));
  const bills = pending(s, today);
  const reserved = bills.reduce((n, o) => n + o.amount, 0);
  const free = current === null ? null : current - reserved;
  const limit =
    free === null || days === 0 ? null : Math.floor(Math.max(0, free) / days);
  const rate = dailyRate(s, today);
  const daily = overrideDaily ?? rate.value;
  const result =
    current === null || daily === null || days === 0
      ? null
      : current - reserved - daily * days;
  const points: { date: string; balance: number }[] = [];
  let zeroDate: string | null = null;
  let shortfallDate: string | null = null;
  if (current !== null && daily !== null && days > 0) {
    let b = current;
    points.push({ date: today, balance: b });
    if (b <= 0) zeroDate = today;
    if (b < 0) shortfallDate = today;
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      b -=
        bills
          .filter((o) => (o.due < today ? today : o.due) === date)
          .reduce((n, o) => n + o.amount, 0) + daily;
      if (b <= 0 && !zeroDate) zeroDate = date;
      if (b < 0 && !shortfallDate) shortfallDate = date;
      points.push({ date: addDays(today, i + 1), balance: b });
    }
  }
  const risk =
    days === 0
      ? "stale"
      : free !== null && free < 0
        ? "red"
        : result === null
          ? "unknown"
          : result < 0
            ? "red"
            : result < (daily ?? 0) * 2
              ? "amber"
              : "green";
  return {
    current,
    days,
    bills,
    reserved,
    free,
    limit,
    rate,
    daily,
    result,
    points,
    zeroDate,
    shortfallDate,
    risk,
    saving:
      daily !== null && limit !== null ? Math.max(0, daily - limit) : null,
  };
}
export function payObligation(
  s: FinanceState,
  id: string,
  date = todayISO(),
): FinanceState {
  const o = s.obligations.find((x) => x.id === id);
  if (!o || o.paidTxId) return s;
  const tx: Transaction = {
    id: uid(),
    date,
    amount: o.amount,
    type: "expense",
    category: o.category,
    note: o.name,
    required: true,
    obligationId: o.id,
  };
  return {
    ...s,
    transactions: [...s.transactions, tx],
    obligations: s.obligations.map((x) =>
      x.id === id ? { ...x, paidTxId: tx.id } : x,
    ),
  };
}
export function deleteTransaction(s: FinanceState, id: string): FinanceState {
  return {
    ...s,
    transactions: s.transactions.filter((t) => t.id !== id),
    obligations: s.obligations.map((o) =>
      o.paidTxId === id ? { ...o, paidTxId: undefined } : o,
    ),
  };
}
export function reconcile(
  s: FinanceState,
  amount: number,
  date = todayISO(),
): FinanceState {
  return {
    ...s,
    opening: {
      amount,
      date,
      excludedIds: s.transactions.map((t) => t.id),
      estimated: false,
    },
  };
}
export function analytics(s: FinanceState, start: string, end: string) {
  const tx = s.transactions.filter(
    (t) => t.type === "expense" && t.date >= start && t.date <= end,
  );
  const total = tx.reduce((n, t) => n + t.amount, 0);
  const required = tx
    .filter((t) => t.required)
    .reduce((n, t) => n + t.amount, 0);
  const categories = CATEGORIES.map((c) => ({
    ...c,
    value: tx
      .filter((t) => t.category === c.id)
      .reduce((n, t) => n + t.amount, 0),
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const income = s.transactions
    .filter((t) => t.type === "income" && t.date >= start && t.date <= end)
    .reduce((n, t) => n + t.amount, 0);
  return {
    tx,
    total,
    required,
    optional: total - required,
    categories,
    income,
  };
}
export function scenarioRate(
  s: FinanceState,
  kind: "daily" | "delivery" | "shopping",
  reduction: number,
  today = todayISO(),
) {
  const rate = dailyRate(s, today).value;
  if (rate === null) return null;
  if (kind === "daily") return Math.max(0, rate - reduction);
  const days = dayDiff(s.trackingSince, today);
  if (days < 3) return null;
  const category = kind === "delivery" ? "delivery" : "shopping";
  const sum = s.transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        !t.required &&
        t.category === category &&
        t.date >= s.trackingSince &&
        t.date < today,
    )
    .reduce((n, t) => n + t.amount, 0);
  return Math.max(
    0,
    rate - Math.round((sum / days) * (kind === "delivery" ? 0.5 : 1)),
  );
}
export function validateState(input: unknown): FinanceState {
  const s = input as FinanceState;
  const fail = () => {
    throw new Error("Файл содержит некорректные финансовые данные.");
  };
  const amt = (x: unknown, negative = false) =>
    typeof x === "number" &&
    Number.isSafeInteger(x) &&
    Math.abs(x) <= MAX_MONEY &&
    (negative || x >= 0);
  const str = (x: unknown) => typeof x === "string" && x.length <= 500;
  const id = (x: unknown) =>
    typeof x === "string" && x.length > 0 && x.length < 150;
  const cat = (x: unknown) => CATEGORIES.some((c) => c.id === x);
  if (
    !s ||
    s.version !== 1 ||
    !amt(s.salary) ||
    !isDate(s.lastPay) ||
    !isDate(s.nextPay) ||
    s.nextPay <= s.lastPay ||
    dayDiff(s.lastPay, s.nextPay) > 730 ||
    !["monthly", "twice", "weekly", "custom"].includes(s.frequency) ||
    !s.opening ||
    !(s.opening.amount === null || amt(s.opening.amount, true)) ||
    !isDate(s.opening.date) ||
    !Array.isArray(s.opening.excludedIds) ||
    !s.opening.excludedIds.every(id) ||
    typeof s.opening.estimated !== "boolean" ||
    !(s.daily === null || amt(s.daily)) ||
    !isDate(s.trackingSince) ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.transactions) ||
    !Array.isArray(s.obligations) ||
    s.transactions.length > 50000 ||
    s.obligations.length > 1000
  )
    fail();
  for (const t of s.transactions)
    if (
      !t ||
      !id(t.id) ||
      !isDate(t.date) ||
      !amt(t.amount) ||
      t.amount <= 0 ||
      !["expense", "income"].includes(t.type) ||
      !cat(t.category) ||
      !str(t.note) ||
      typeof t.required !== "boolean" ||
      (t.obligationId !== undefined && !id(t.obligationId))
    )
      fail();
  for (const o of s.obligations)
    if (
      !o ||
      !id(o.id) ||
      !str(o.name) ||
      !o.name.trim() ||
      !amt(o.amount) ||
      o.amount <= 0 ||
      !amt(o.total) ||
      !isDate(o.due) ||
      !cat(o.category) ||
      !["bill", "debt"].includes(o.kind) ||
      (o.kind === "debt" && o.total < o.amount) ||
      (o.paidTxId !== undefined && !id(o.paidTxId))
    )
      fail();
  if (
    new Set(s.transactions.map((t) => t.id)).size !== s.transactions.length ||
    new Set(s.obligations.map((o) => o.id)).size !== s.obligations.length
  )
    fail();
  for (const o of s.obligations) {
    if (o.paidTxId) {
      const t = s.transactions.find((t) => t.id === o.paidTxId);
      if (
        !t ||
        t.obligationId !== o.id ||
        t.amount !== o.amount ||
        t.type !== "expense" ||
        !t.required
      )
        fail();
    }
  }
  for (const t of s.transactions)
    if (
      t.obligationId &&
      !s.obligations.some((o) => o.id === t.obligationId && o.paidTxId === t.id)
    )
      fail();
  return s;
}
export function demoState(today = todayISO()): FinanceState {
  const s = blankState(today);
  s.salary = 35000000;
  s.lastPay = addDays(today, -16);
  s.nextPay = addDays(today, 14);
  s.trackingSince = addDays(today, -16);
  s.daily = 450000;
  s.opening = {
    amount: 10500000,
    date: today,
    excludedIds: [],
    estimated: false,
  };
  s.obligations = [
    {
      id: "demo-debt",
      name: "Kaspi • рассрочка",
      amount: 1850000,
      total: 14800000,
      due: addDays(today, 3),
      category: "credit",
      kind: "debt",
    },
    {
      id: "demo-bill",
      name: "Коммунальные услуги",
      amount: 1250000,
      total: 0,
      due: addDays(today, 5),
      category: "home",
      kind: "bill",
    },
    {
      id: "demo-net",
      name: "Интернет и связь",
      amount: 600000,
      total: 0,
      due: addDays(today, 8),
      category: "other",
      kind: "bill",
    },
  ];
  const rows: [Category, number, string, boolean, number][] = [
    ["home", 120000, "Аренда квартиры", true, 15],
    ["food", 16800, "Magnum", false, 12],
    ["delivery", 6400, "Ужин дома", false, 11],
    ["transport", 2800, "Поездки по городу", false, 10],
    ["food", 12800, "Продукты на неделю", false, 8],
    ["shopping", 17500, "Новые кроссовки", false, 7],
    ["cafe", 4800, "Кофе с друзьями", false, 6],
    ["delivery", 5600, "Обед", false, 4],
    ["food", 10700, "Продукты", false, 3],
    ["subscriptions", 3200, "Музыка и кино", true, 2],
    ["cafe", 2400, "Кофейня", false, 1],
  ];
  s.transactions = rows.map((r, i) => ({
    id: "demo-t" + i,
    category: r[0],
    amount: r[1] * 100,
    note: r[2],
    required: r[3],
    date: addDays(today, -r[4]),
    type: "expense",
  }));
  return s;
}
