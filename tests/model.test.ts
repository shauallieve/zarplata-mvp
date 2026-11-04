import { describe, it, expect } from "vitest";
import {
  blankState,
  forecast,
  balance,
  payObligation,
  deleteTransaction,
  reconcile,
  addMonths,
  dayDiff,
  parseMoney,
  validateState,
  scenarioRate,
  dailyRate,
  analytics,
  type FinanceState,
} from "../src/model";
import { loadState, saveState, KEY } from "../src/storage";
const day = "2026-11-03";
function fixture(): FinanceState {
  const s = blankState(day);
  s.opening.amount = 1000000;
  s.nextPay = "2026-11-13";
  s.daily = 50000;
  s.obligations = [
    {
      id: "d",
      name: "Debt",
      kind: "debt",
      amount: 200000,
      total: 5000000,
      due: "2026-11-06",
      category: "credit",
    },
  ];
  return s;
}
describe("Money and calendar", () => {
  it("parses cents exactly and accepts zero/negative balance", () => {
    expect(parseMoney("1 234,56")).toBe(123456);
    expect(parseMoney("-2", { negative: true })).toBe(-200);
    expect(parseMoney("0")).toBe(0);
  });
  it.each(["NaN", "Infinity", "1e9", "1.001", "-5", "1000000001", ""])(
    "rejects malformed amount %s",
    (value) => expect(() => parseMoney(value)).toThrow(),
  );
  it("clamps month ends, leap years and year transition", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
    expect(dayDiff("2026-12-30", "2027-01-02")).toBe(3);
  });
});
describe("Financial model", () => {
  it("subtracts upcoming installment, never total debt", () => {
    const f = forecast(fixture(), day);
    expect(f.current).toBe(1000000);
    expect(f.reserved).toBe(200000);
    expect(f.free).toBe(800000);
    expect(f.limit).toBe(80000);
    expect(f.result).toBe(300000);
  });
  it("does not double-charge historical transactions", () => {
    const s = fixture();
    s.transactions = [
      {
        id: "old",
        date: "2026-11-02",
        type: "expense",
        category: "food",
        amount: 999999,
        note: "",
        required: false,
      },
    ];
    expect(balance(s, day)).toBe(1000000);
  });
  it("payment is idempotent and preserves free budget", () => {
    const s = fixture(),
      p = payObligation(s, "d", day);
    expect(balance(p, day)).toBe(800000);
    expect(forecast(p, day).free).toBe(forecast(s, day).free);
    expect(payObligation(p, "d", day)).toEqual(p);
    expect(validateState(p)).toEqual(p);
  });
  it("deleting linked payment restores reservation and cash", () => {
    const p = payObligation(fixture(), "d", day);
    const s = deleteTransaction(p, p.transactions[0].id);
    expect(balance(s, day)).toBe(1000000);
    expect(forecast(s, day).reserved).toBe(200000);
  });
  it("reconciles same-day transactions without duplicate deduction", () => {
    const p = payObligation(fixture(), "d", day);
    const s = reconcile(p, 500000, day);
    expect(balance(s, day)).toBe(500000);
    expect(balance(deleteTransaction(s, p.transactions[0].id), day)).toBe(
      500000,
    );
  });
  it("includes overdue payments and excludes payday payments", () => {
    const s = fixture();
    s.obligations[0].due = "2026-10-01";
    expect(forecast(s, day).reserved).toBe(200000);
    s.obligations[0].due = s.nextPay;
    expect(forecast(s, day).reserved).toBe(0);
  });
  it("has no fabricated prediction without daily data", () => {
    const s = fixture();
    s.daily = null;
    expect(forecast(s, day).result).toBe(null);
    expect(forecast(s, day).points).toEqual([]);
    expect(forecast(s, day).limit).toBe(80000);
  });
  it("does not assume zero spending from an empty history after several days", () => {
    const s = fixture();
    s.daily = null;
    s.trackingSince = "2026-10-01";
    expect(dailyRate(s, day).value).toBe(null);
    expect(forecast(s, day).result).toBe(null);
  });
  it("does not invent a missing balance", () => {
    const s = fixture();
    s.opening.amount = null;
    expect(forecast(s, day).free).toBe(null);
    expect(forecast(s, day).result).toBe(null);
  });
  it("supports negative balances and identifies structural deficit", () => {
    const s = fixture();
    s.opening.amount = -100;
    const f = forecast(s, day);
    expect(f.limit).toBe(0);
    expect(f.risk).toBe("red");
    expect(f.shortfallDate).toBe(day);
  });
  it("simulates a payment cliff on exact day", () => {
    const s = fixture();
    s.opening.amount = 250000;
    s.daily = 20000;
    expect(forecast(s, day).shortfallDate).toBe("2026-11-06");
    expect(forecast(s, day).points.at(-1)?.balance).toBe(
      forecast(s, day).result,
    );
  });
  it("avoids division by zero on payday and past payday", () => {
    const s = fixture();
    s.nextPay = day;
    expect(forecast(s, day).limit).toBe(null);
    expect(forecast(s, day).risk).toBe("stale");
  });
  it("models zero spending explicitly", () => {
    const s = fixture();
    s.daily = 0;
    expect(forecast(s, day).result).toBe(800000);
  });
  it("historical mean includes full zero-spend days and excludes bills/today", () => {
    const s = fixture();
    s.daily = null;
    s.trackingSince = "2026-10-31";
    s.transactions = [
      {
        id: "x",
        date: "2026-11-01",
        type: "expense",
        amount: 90000,
        category: "food",
        note: "",
        required: false,
      },
      {
        id: "y",
        date: day,
        type: "expense",
        amount: 20000,
        category: "food",
        note: "",
        required: false,
      },
    ];
    expect(dailyRate(s, day).value).toBe(30000);
  });
  it("scenarios never mutate real data and cannot become negative", () => {
    const s = fixture(),
      before = JSON.stringify(s);
    expect(scenarioRate(s, "daily", 100000, day)).toBe(0);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("income and transaction edits update cash", () => {
    const s = fixture();
    s.transactions = [
      {
        id: "i",
        date: day,
        type: "income",
        amount: 50000,
        category: "other",
        note: "",
        required: false,
      },
    ];
    expect(balance(s, day)).toBe(1050000);
    s.transactions[0].amount = 10000;
    expect(balance(s, day)).toBe(1010000);
  });
  it("prevents forged paid references", () => {
    const s = fixture();
    s.obligations[0].paidTxId = "fake";
    expect(() => validateState(s)).toThrow();
  });
  it("rejects invalid dates and unknown versions", () => {
    const s = fixture();
    s.nextPay = "2026-02-30";
    expect(() => validateState(s)).toThrow();
    expect(() => validateState({ version: 2 })).toThrow();
  });
  it("analytics uses actual expenses only", () => {
    const a = analytics(fixture(), "2026-11-01", "2026-11-30");
    expect(a.total).toBe(0);
  });
});
describe("Persistence", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
      removeItem: (k: string) => {
        m.delete(k);
      },
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    } as Storage;
  };
  it("round-trips validated state", () => {
    const st = memory();
    saveState(st, fixture());
    expect(loadState(st).state).toEqual(fixture());
  });
  it("recovers last valid backup", () => {
    const st = memory();
    saveState(st, fixture());
    saveState(st, fixture());
    st.setItem(KEY, "broken");
    expect(loadState(st).state).toEqual(fixture());
    expect(loadState(st).warning).toBeTruthy();
  });
  it("retains corrupt data and fails safely", () => {
    const st = memory();
    st.setItem(KEY, "broken");
    expect(loadState(st).state).toBe(null);
    expect(st.getItem(KEY)).toBe("broken");
  });
  it("reports denied storage", () => {
    const st = {
      getItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(loadState(st).warning).toBeTruthy();
  });
});
