import { useState, type FormEvent } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Field, MoneyField, ErrorText } from "./ui";
import {
  CATEGORIES,
  todayISO,
  parseMoney,
  uid,
  money,
  isDate,
  addMonths,
  nextDate,
  type FinanceState,
  type Transaction,
  type Obligation,
  type Category,
  type Frequency,
} from "./model";
export function TransactionForm({
  state,
  existing,
  type = "expense",
  onSave,
  onDelete,
}: {
  state: FinanceState;
  existing?: Transaction;
  type?: "expense" | "income";
  onSave: (t: Transaction, inOpening: boolean) => void;
  onDelete?: () => void;
}) {
  const [amount, setAmount] = useState(
      existing ? String(existing.amount / 100) : "",
    ),
    [category, setCategory] = useState<Category>(existing?.category ?? "food"),
    [note, setNote] = useState(existing?.note ?? ""),
    [date, setDate] = useState(existing?.date ?? todayISO()),
    [required, setRequired] = useState(existing?.required ?? false),
    [inOpening, setInOpening] = useState(
      existing ? state.opening.excludedIds.includes(existing.id) : false,
    ),
    [error, setError] = useState("");
  const txType = existing?.type ?? type;
  function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (date > todayISO() || !isDate(date))
        throw Error("Для истории выбери сегодняшнюю или прошедшую дату.");
      onSave(
        {
          id: existing?.id ?? uid(),
          date,
          amount: parseMoney(amount, { zero: false }),
          type: txType,
          category: txType === "income" ? "other" : category,
          note: note.trim(),
          required: txType === "expense" && required,
        },
        inOpening,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={save}>
      <MoneyField
        label={
          txType === "income" ? "Сумма поступления, ₸" : "Сумма расхода, ₸"
        }
        autoFocus
        className="amount-input"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      {txType === "expense" && (
        <div
          className="category-picker"
          role="group"
          aria-label="Категория расхода"
        >
          {CATEGORIES.map((c) => (
            <button
              type="button"
              aria-pressed={category === c.id}
              className={category === c.id ? "selected" : ""}
              key={c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <Field
        label="Комментарий"
        placeholder={
          txType === "income"
            ? "Например, подработка"
            : "На что потратил? Необязательно"
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
      />
      <Field
        label="Дата операции"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        max={todayISO()}
        required
      />
      {txType === "expense" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Обязательный расход{" "}
          <small>Не включать в среднее переменных трат</small>
        </label>
      )}
      {date >= state.opening.date && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={inOpening}
            onChange={(e) => setInOpening(e.target.checked)}
          />
          Уже учтено в подтверждённом остатке
        </label>
      )}
      {date < state.opening.date && (
        <p className="field-note">
          Эта операция старше подтверждённого остатка. Она появится в истории и
          аналитике, но баланс не изменит.
        </p>
      )}
      {txType === "expense" && (
        <p className="field-note">
          Оплату запланированного платежа удобнее отмечать в разделе «Мои долги»
          или на главной.
        </p>
      )}
      <ErrorText message={error} />
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="button danger" onClick={onDelete}>
            <Trash2 size={17} />
            Удалить
          </button>
        )}
        <button type="submit" className="button primary grow">
          <Check size={18} />
          Сохранить
        </button>
      </div>
    </form>
  );
}
export function ObligationForm({
  existing,
  kind = "bill",
  renew = false,
  onSave,
  onDelete,
}: {
  existing?: Obligation;
  kind?: "bill" | "debt";
  renew?: boolean;
  onSave: (o: Obligation, renew: boolean) => void;
  onDelete?: () => void;
}) {
  const debt = (existing?.kind ?? kind) === "debt";
  const [name, setName] = useState(existing?.name ?? ""),
    [amount, setAmount] = useState(
      existing ? String(existing.amount / 100) : "",
    ),
    [total, setTotal] = useState(existing ? String(existing.total / 100) : ""),
    [due, setDue] = useState(
      existing
        ? renew
          ? addMonths(existing.due, 1)
          : existing.due
        : todayISO(),
    ),
    [category, setCategory] = useState<Category>(
      existing?.category ?? (debt ? "credit" : "home"),
    ),
    [error, setError] = useState("");
  function save(e: FormEvent) {
    e.preventDefault();
    try {
      const a = parseMoney(amount, { zero: false }),
        t = debt ? parseMoney(total, { zero: false }) : 0;
      if (!name.trim() || !isDate(due)) throw Error("Заполни название и дату.");
      if (debt && a > t)
        throw Error("Платёж не может превышать указанный остаток долга.");
      onSave(
        {
          id: existing?.id ?? uid(),
          name: name.trim(),
          amount: a,
          total: t,
          due,
          category,
          kind: debt ? "debt" : "bill",
        },
        renew,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={save}>
      <Field
        label="Название"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        required
      />
      {debt && (
        <MoneyField
          label="Текущий остаток всего долга, ₸"
          hint="Справочная сумма по данным банка. Обновляй после оплаты: часть платежа может уходить на проценты."
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          required
        />
      )}
      <MoneyField
        label="Ближайший платёж, ₸"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <Field
        label="Дата платежа"
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        required
      />
      {!debt && (
        <label className="field">
          <span>Категория</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {renew && (
        <p className="info-note">
          Предыдущая оплата останется в истории. Новый платёж будет ожидать
          оплаты.
        </p>
      )}
      <ErrorText message={error} />
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="button danger" onClick={onDelete}>
            <Trash2 size={17} />
            Удалить
          </button>
        )}
        <button type="submit" className="button primary grow">
          <Plus size={17} />
          Сохранить
        </button>
      </div>
    </form>
  );
}
export function PaymentForm({
  state,
  bill,
  onPay,
}: {
  state: FinanceState;
  bill: Obligation;
  onPay: (date: string, existingId?: string) => void;
}) {
  const eligible = state.transactions.filter(
    (t) => t.type === "expense" && t.amount === bill.amount && !t.obligationId,
  );
  const [mode, setMode] = useState("new"),
    [id, setId] = useState(eligible[0]?.id ?? ""),
    [date, setDate] = useState(todayISO());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onPay(date, mode === "link" ? id : undefined);
      }}
    >
      <div className="payment-total">
        <span>{bill.name}</span>
        <b>{money(bill.amount)}</b>
      </div>
      <label className="radio-row">
        <input
          type="radio"
          checked={mode === "new"}
          onChange={() => setMode("new")}
        />
        Совершил оплату — списать с баланса
      </label>
      <label className="radio-row">
        <input
          type="radio"
          checked={mode === "link"}
          disabled={!eligible.length}
          onChange={() => setMode("link")}
        />
        Уже добавил этот расход — связать запись
      </label>
      {mode === "link" ? (
        <label className="field">
          <span>Ранее добавленный расход с такой же суммой</span>
          <select value={id} onChange={(e) => setId(e.target.value)} required>
            {eligible.map((t) => (
              <option key={t.id} value={t.id}>
                {t.date} · {t.note || "Без комментария"} · {money(t.amount)}
              </option>
            ))}
          </select>
          <small>Повторного списания не будет.</small>
        </label>
      ) : (
        <Field
          label="Фактическая дата оплаты"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayISO()}
          required
        />
      )}
      <p className="field-note">
        Неоплаченный резерв исчезнет, а в истории останется одна операция.
      </p>
      <button className="button primary full" type="submit">
        <Check size={18} />
        Подтвердить оплату
      </button>
    </form>
  );
}
export function SalaryForm({
  state,
  onSave,
}: {
  state: FinanceState;
  onSave: (
    amount: number,
    lastPay: string,
    nextPay: string,
    frequency: Frequency,
    received: boolean,
  ) => void;
}) {
  const [amount, setAmount] = useState(String(state.salary / 100)),
    [last, setLast] = useState(state.lastPay),
    [next, setNext] = useState(state.nextPay),
    [freq, setFreq] = useState(state.frequency),
    [received, setReceived] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (
            !isDate(last) ||
            !isDate(next) ||
            next <= last ||
            last > todayISO()
          )
            throw Error("Проверь даты выплат.");
          onSave(
            parseMoney(amount, { zero: false }),
            last,
            next,
            freq,
            received,
          );
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <MoneyField
        label="Сумма одной выплаты, ₸"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <label className="field">
        <span>Периодичность</span>
        <select
          value={freq}
          onChange={(e) => setFreq(e.target.value as Frequency)}
        >
          <option value="monthly">Раз в месяц</option>
          <option value="twice">Дважды в месяц</option>
          <option value="weekly">Раз в неделю</option>
          <option value="custom">Свой график</option>
        </select>
      </label>
      <Field
        label="Дата последней выплаты"
        type="date"
        value={last}
        max={todayISO()}
        onChange={(e) => setLast(e.target.value)}
        required
      />
      <Field
        label="Следующая зарплата"
        type="date"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
      />
      <label className="check-label">
        <input
          type="checkbox"
          checked={received}
          onChange={(e) => {
            setReceived(e.target.checked);
            if (e.target.checked) {
              setLast(todayISO());
              setNext(nextDate(todayISO(), freq));
            }
          }}
        />
        Получил новую зарплату: добавить поступление
      </label>
      <p className="field-note">
        Включай только если это поступление ещё не записано. Платежи на
        следующий месяц добавляются после оплаты кнопкой «Следующий платёж».
      </p>
      <ErrorText message={error} />
      <button className="button primary full">Сохранить</button>
    </form>
  );
}
