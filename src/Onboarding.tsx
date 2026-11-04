import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Wallet,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  Play,
} from "lucide-react";
import { Brand, Field, MoneyField, Privacy, ErrorText } from "./ui";
import {
  blankState,
  todayISO,
  parseMoney,
  uid,
  nextDate,
  dayDiff,
  money,
  CATEGORIES,
  type FinanceState,
  type Obligation,
  type Frequency,
  type Category,
} from "./model";
const STEPS = [
  "Зарплата",
  "Деньги сейчас",
  "Обязательные расходы",
  "Кредиты и долги",
  "Повседневные траты",
];
export default function Onboarding({
  onFinish,
  onDemo,
  onSettings,
}: {
  onFinish: (s: FinanceState) => void;
  onDemo: () => void;
  onSettings: () => void;
}) {
  const [step, setStep] = useState(0),
    [s, setS] = useState(blankState),
    [error, setError] = useState("");
  const [salary, setSalary] = useState(""),
    [current, setCurrent] = useState(""),
    [spent, setSpent] = useState(""),
    [prior, setPrior] = useState(""),
    [estimated, setEstimated] = useState(false),
    [daily, setDaily] = useState("");
  const [name, setName] = useState(""),
    [amount, setAmount] = useState(""),
    [total, setTotal] = useState(""),
    [due, setDue] = useState(todayISO()),
    [cat, setCat] = useState<Category>("home");
  const update = (p: Partial<FinanceState>) => setS({ ...s, ...p });
  function add() {
    try {
      if (!name.trim()) throw Error("Введите название платежа.");
      const value = parseMoney(amount, { zero: false });
      const debt = step === 3;
      const rest = debt ? parseMoney(total, { zero: false }) : 0;
      if (debt && rest < value)
        throw Error("Платёж не должен превышать указанный остаток долга.");
      const o: Obligation = {
        id: uid(),
        name: name.trim(),
        amount: value,
        total: rest,
        kind: debt ? "debt" : "bill",
        due,
        category: debt ? "credit" : cat,
      };
      if (!due) throw Error("Укажите дату платежа.");
      update({ obligations: [...s.obligations, o] });
      setName("");
      setAmount("");
      setTotal("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function next(e: FormEvent) {
    e.preventDefault();
    try {
      let value = { ...s };
      if (step === 0) {
        value.salary = parseMoney(salary, { zero: false });
        if (
          s.lastPay > todayISO() ||
          s.nextPay <= todayISO() ||
          s.nextPay <= s.lastPay ||
          dayDiff(s.lastPay, s.nextPay) > 730
        )
          throw Error(
            "Проверьте даты: последняя выплата уже была, следующая — в будущем (не далее двух лет).",
          );
      }
      if (step === 1) {
        value.opening = {
          ...s.opening,
          amount: current.trim()
            ? parseMoney(current, { negative: true })
            : estimated
              ? parseMoney(prior, { negative: true }) +
                s.salary -
                parseMoney(spent)
              : null,
          estimated: !current.trim() && estimated,
        };
      }
      if (
        (step === 2 || step === 3) &&
        (name.trim() || amount.trim() || total.trim())
      )
        throw Error(
          "Добавьте заполненный платёж кнопкой «Добавить» или очистите поля.",
        );
      if (step === 4) {
        value.daily = daily.trim() ? parseMoney(daily) : null;
        onFinish(value);
        return;
      }
      setS(value);
      setStep(step + 1);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="onboarding">
      <header className="welcome-header">
        <Brand />
        <button className="button secondary small" onClick={onDemo}>
          <Play size={15} />
          Посмотреть демо
        </button>
      </header>
      <main className="welcome-main">
        <section className="welcome-copy">
          <span className="eyebrow">
            <span className="live-dot" />
            МЕНЬШЕ ТРЕВОГИ. БОЛЬШЕ ЯСНОСТИ.
          </span>
          <h1>
            Зарплата пришла.
            <br />
            <em>А куда ушла?</em>
          </h1>
          <p className="welcome-description">
            Разберёмся вместе. Узнай, сколько можно тратить сегодня, чтобы
            спокойно дойти до следующей зарплаты.
          </p>
          <div className="welcome-graphic" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="graphic-core">
              <Wallet size={39} />
            </div>
            <span className="graphic-chip chip-one">
              <Check size={17} />
              Платежи учтены
            </span>
            <span className="graphic-chip chip-two">
              <CalendarDays size={17} />
              До зарплаты — по плану
            </span>
            <span className="graphic-spark">✳</span>
          </div>
          <div className="welcome-facts">
            <span>
              <b>≈ 60 сек.</b>до первой ясности
            </span>
            <span>
              <b>0 ₸</b>и без регистрации
            </span>
          </div>
          <Privacy />
        </section>
        <section className="setup-card">
          <div className="setup-top">
            <span>ЗНАКОМСТВО С ТВОИМИ ДЕНЬГАМИ</span>
            <b>
              0{step + 1}
              <i> / 05</i>
            </b>
          </div>
          <div className="step-lines" aria-label={`Шаг ${step + 1} из 5`}>
            {STEPS.map((v, i) => (
              <span key={v} className={i <= step ? "active" : ""} />
            ))}
          </div>
          <div className="step-title">
            <span>ШАГ {step + 1}</span>
            <h2>{STEPS[step]}</h2>
            <p>
              {
                [
                  "Начнём с двух дат и одной суммы.",
                  "Сумма на всех картах и наличные вместе.",
                  "Добавь только ещё не оплаченные платежи.",
                  "Учтём ближайшие платежи, а не весь долг.",
                  "Последний шаг. Сколько обычно уходит в день?",
                ][step]
              }
            </p>
          </div>
          <form onSubmit={next}>
            {step === 0 && (
              <>
                <MoneyField
                  label="Сумма одной выплаты, ₸"
                  placeholder="Например, 350 000"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  required
                />
                <label className="field">
                  <span>Как часто приходит зарплата?</span>
                  <select
                    value={s.frequency}
                    onChange={(e) => {
                      const f = e.target.value as Frequency;
                      update({ frequency: f, nextPay: nextDate(s.lastPay, f) });
                    }}
                  >
                    <option value="monthly">Раз в месяц</option>
                    <option value="twice">Дважды в месяц</option>
                    <option value="weekly">Раз в неделю</option>
                    <option value="custom">Свой график</option>
                  </select>
                </label>
                <div className="form-grid">
                  <Field
                    label="Последняя зарплата"
                    type="date"
                    value={s.lastPay}
                    max={todayISO()}
                    onChange={(e) => {
                      const v = e.target.value;
                      update({
                        lastPay: v,
                        ...(v ? { nextPay: nextDate(v, s.frequency) } : {}),
                      });
                    }}
                    required
                  />
                  <Field
                    label="Следующая зарплата"
                    type="date"
                    value={s.nextPay}
                    onChange={(e) => update({ nextPay: e.target.value })}
                    required
                  />
                </div>
                <p className="field-note">
                  Даты можно уточнить вручную, в том числе при двух выплатах в
                  месяц.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <MoneyField
                  label="Сколько доступно сейчас, ₸"
                  hint="Уже с учётом всех совершённых трат. Можно указать минус."
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <div className="info-note">
                  <ShieldCheck size={20} />
                  <span>
                    Прошлые расходы не будут списаны из этого остатка повторно.
                  </span>
                </div>
                <details>
                  <summary>
                    Не знаю точный остаток <ChevronRight size={16} />
                  </summary>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={estimated}
                      onChange={(e) => setEstimated(e.target.checked)}
                    />
                    Рассчитать приблизительно
                  </label>
                  {estimated && (
                    <>
                      <MoneyField
                        label="Было до последней зарплаты, ₸"
                        value={prior}
                        onChange={(e) => setPrior(e.target.value)}
                      />
                      <MoneyField
                        label="Всего потрачено после неё, ₸"
                        value={spent}
                        onChange={(e) => setSpent(e.target.value)}
                      />
                      <small>
                        Оценка = прошлый остаток + зарплата − все траты.
                        Подходит, если других поступлений не было.
                      </small>
                    </>
                  )}
                </details>
                <p className="field-note">
                  Можно продолжить без остатка. Прогноз появится, когда добавишь
                  его.
                </p>
              </>
            )}
            {(step === 2 || step === 3) && (
              <>
                <div className="setup-payments">
                  {s.obligations
                    .filter((o) => o.kind === (step === 3 ? "debt" : "bill"))
                    .map((o) => (
                      <div className="setup-payment" key={o.id}>
                        <span>
                          {o.name}
                          <small>{o.due}</small>
                        </span>
                        <b>{money(o.amount)}</b>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Удалить ${o.name}`}
                          onClick={() =>
                            update({
                              obligations: s.obligations.filter(
                                (x) => x.id !== o.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                </div>
                <Field
                  label={
                    step === 3
                      ? "Название кредита или долга"
                      : "Название платежа"
                  }
                  placeholder={
                    step === 3
                      ? "Например, рассрочка Kaspi"
                      : "Например, аренда квартиры"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
                {step === 2 && (
                  <>
                    <div className="quick-chips">
                      {[
                        "Аренда / ипотека",
                        "Коммунальные",
                        "Связь и интернет",
                        "Транспорт",
                        "Продукты",
                        "Другое",
                      ].map((n, i) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setName(n);
                            setCat(
                              (
                                [
                                  "home",
                                  "home",
                                  "other",
                                  "transport",
                                  "food",
                                  "other",
                                ] as Category[]
                              )[i],
                            );
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {step === 3 && (
                  <MoneyField
                    label="Остаток всего долга, ₸"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                  />
                )}
                <div className="form-grid">
                  <MoneyField
                    label="Ближайший платёж, ₸"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Field
                    label="Дата платежа"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="button secondary full"
                  onClick={add}
                >
                  <Plus size={17} />
                  Добавить {step === 3 ? "долг" : "платёж"}
                </button>
                <p className="field-note">
                  {step === 2
                    ? "Если резервируешь деньги на продукты или транспорт здесь, не включай их в ежедневные переменные траты."
                    : "Остаток долга — справочная сумма. Из бюджета вычтем только неоплаченный платёж."}
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <MoneyField
                  label="В среднем за день, ₸"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  placeholder="Например, 4 500"
                />
                <div className="info-note">
                  <Wallet size={20} />
                  <span>
                    Укажи повседневные траты сверх платежей, которые добавил на
                    предыдущих шагах.
                  </span>
                </div>
                <p className="field-note">
                  Не знаешь? Оставь пустым. После трёх полных дней учёта
                  рассчитаем среднее по истории. До этого будет доступен дневной
                  лимит без точного прогноза.
                </p>
              </>
            )}
            <ErrorText message={error} />
            <div className="setup-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                  }}
                  aria-label="Назад"
                >
                  <ArrowLeft size={19} />
                </button>
              )}
              <button className="button primary grow" type="submit">
                {step === 4 ? "Увидеть мою картину" : "Продолжить"}
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="setup-footer">
              <ShieldCheck size={14} />
              Без доступа к банкам и личным счетам
            </div>
          </form>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>Куда исчезает зарплата? © 2026</span>
        <button className="plain-button" onClick={onSettings}>
          Данные и восстановление
        </button>
        <span>Сделано для жизни, а не для бухгалтерии.</span>
      </footer>
    </div>
  );
}
