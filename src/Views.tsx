import { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Check,
  Plus,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  SlidersHorizontal,
  Sparkles,
  Clock,
  Search,
  Wallet,
  Landmark,
  ChevronRight,
  Pencil,
  Repeat,
  Info,
} from "lucide-react";
import { CatIcon, Empty, TextLink } from "./ui";
import {
  analytics,
  forecast,
  money,
  dateLabel,
  dayDiff,
  addDays,
  CATEGORIES,
  categoryName,
  scenarioRate,
  type FinanceState,
  type Obligation,
  type Transaction,
  type Category,
} from "./model";
export type Page = "home" | "analytics" | "history" | "debts" | "plan";
type Common = { s: FinanceState; today: string };
export function ForecastChart({
  s,
  today,
  alternative,
}: {
  s: FinanceState;
  today: string;
  alternative?: number;
}) {
  const f = forecast(s, today);
  const a = alternative === undefined ? null : forecast(s, today, alternative);
  const data = f.points.map((p, i) => ({
    ...p,
    alternative: a?.points[i]?.balance,
  }));
  if (!data.length)
    return (
      <Empty title="Прогнозу нужны данные">
        Добавь текущий остаток и средние переменные траты. Тогда здесь появится
        движение денег по дням.
      </Empty>
    );
  return (
    <div
      className="forecast-chart"
      role="img"
      aria-label={`Прогноз остатка к зарплате: ${money(f.result)}. ${f.zeroDate ? "Деньги могут закончиться " + dateLabel(f.zeroDate) : "Нулевой остаток не ожидается."}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b6efad" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#b6efad" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#2a332d"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => dateLabel(v)}
            minTickGap={35}
            tick={{ fill: "#839188", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={55}
            tickFormatter={(v) => `${Math.round(v / 100000)}к`}
            tick={{ fill: "#839188", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#202a23",
              border: "1px solid #3c4a40",
              borderRadius: 12,
              color: "#fff",
            }}
            labelFormatter={(v) => dateLabel(String(v), true)}
            formatter={(v: number, name: string) => [
              money(v),
              name === "alternative" ? "После изменений" : "Прогноз остатка",
            ]}
          />
          <ReferenceLine y={0} stroke="#be867e" strokeDasharray="4 4" />
          <Area
            type="linear"
            dataKey="balance"
            stroke="#b6efad"
            strokeWidth={2.4}
            fill="url(#balance-fill)"
            isAnimationActive={false}
          />
          {a && (
            <Area
              type="linear"
              dataKey="alternative"
              stroke="#d4b4f4"
              strokeWidth={2}
              fill="transparent"
              strokeDasharray="5 4"
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function BillsList({
  bills,
  today,
  onPay,
  limit,
}: {
  bills: Obligation[];
  today: string;
  onPay: (o: Obligation) => void;
  limit?: number;
}) {
  if (!bills.length)
    return (
      <div className="mini-empty">
        <Check size={20} />
        <span>На этот период платежей нет</span>
      </div>
    );
  return (
    <div className="bills-list">
      {bills.slice(0, limit).map((o) => (
        <div className="bill-row" key={o.id}>
          <CatIcon category={o.category} />
          <div className="row-name">
            <b>{o.name}</b>
            <small className={o.due < today ? "text-amber" : ""}>
              {o.due < today ? "Срок прошёл · " : ""}
              {dateLabel(o.due, true)}
            </small>
          </div>
          <div className="row-right">
            <b>{money(o.amount)}</b>
            <button className="tiny-action" onClick={() => onPay(o)}>
              Оплатить <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function Overview({
  s,
  today,
  onPage,
  onPay,
  onAddBill,
  onBalance,
  onDaily,
  onSalary,
  onEditTx,
}: {
  s: FinanceState;
  today: string;
  onPage: (p: Page) => void;
  onPay: (o: Obligation) => void;
  onAddBill: () => void;
  onBalance: () => void;
  onDaily: () => void;
  onSalary: () => void;
  onEditTx: (t: Transaction) => void;
}) {
  const f = forecast(s, today);
  const a = analytics(s, s.lastPay, today);
  const status =
    f.risk === "green"
      ? "Бюджет в порядке"
      : f.risk === "amber"
        ? "Небольшой запас"
        : f.risk === "red"
          ? "Нужна корректировка"
          : f.risk === "stale"
            ? "Обнови дату зарплаты"
            : "Нужны данные";
  const headline =
    f.risk === "green"
      ? "До зарплаты — спокойно."
      : f.risk === "amber"
        ? "Ты в бюджете. Бережём запас."
        : f.risk === "red"
          ? "Вернём деньгам ясность."
          : f.risk === "stale"
            ? "Новый месяц. Новый план."
            : "Твоя финансовая картина.";
  const description =
    f.free !== null && f.free < 0
      ? `На обязательные платежи не хватает ${money(-f.free)}. Одного сокращения повседневных трат недостаточно.`
      : f.result !== null && f.result < 0
        ? `При текущем темпе к зарплате не хватит ${money(-f.result)}. Посмотрим, что можно изменить.`
        : f.result !== null
          ? `Платежи учтены. При текущем темпе к зарплате останется ${money(f.result)}.`
          : f.risk === "stale"
            ? "Дата выплаты наступила. Обнови период и запиши зарплату, если она уже пришла."
            : "Добавь недостающие данные, чтобы увидеть, на сколько хватит денег.";
  const recent = [...s.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ТВОИ ДЕНЬГИ · ТВОЙ ПЛАН</div>
          <h1>{headline}</h1>
          <p>{description}</p>
        </div>
        <span className={"status-pill " + f.risk}>
          {f.risk === "green" ? <Check size={15} /> : <Info size={15} />}{" "}
          {status}
        </span>
      </div>
      <div className="overview-grid">
        <div className="overview-main">
          <section className="daily-hero">
            <div className="hero-top">
              <span>
                <ShieldCheck size={17} />
                Можно тратить в день
              </span>
              <button
                className="hero-edit"
                onClick={onDaily}
                aria-label="Настроить средние траты"
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>
            <div className="hero-body">
              <div>
                <div className="hero-amount">
                  {f.limit === null
                    ? "—"
                    : new Intl.NumberFormat("ru-RU", {
                        maximumFractionDigits: 0,
                      }).format(Math.floor(f.limit / 100))}
                  <span> ₸</span>
                </div>
                <p>
                  {f.limit === null
                    ? "Уточни баланс и дату зарплаты"
                    : "Лимит после резерва на обязательные платежи"}
                </p>
              </div>
              <div className="days-ring">
                <b>{f.days}</b>
                <span>
                  дней
                  <br />
                  до зарплаты
                </span>
              </div>
            </div>
            <div className="hero-footer">
              <span>
                <CalendarDays size={15} />
                {dateLabel(s.nextPay, true)} · следующая зарплата
              </span>
              <button onClick={onSalary} aria-label="Изменить зарплату">
                <ArrowUpRight size={19} />
              </button>
            </div>
          </section>
          <div className="cash-equation">
            <button onClick={onBalance}>
              <span>
                Сейчас на руках <Pencil size={11} />
              </span>
              <b>{money(f.current)}</b>
              <small>
                {s.opening.estimated
                  ? "Приблизительный остаток"
                  : "Текущий баланс"}
              </small>
            </button>
            <span className="math-sign">−</span>
            <div>
              <span>На платежи</span>
              <b>{money(f.reserved)}</b>
              <small>Неприкосновенный резерв</small>
            </div>
            <span className="math-sign">=</span>
            <div>
              <span>Свободно</span>
              <b
                className={
                  f.free !== null && f.free < 0 ? "text-red" : "text-green"
                }
              >
                {money(f.free)}
              </b>
              <small>На жизнь до зарплаты</small>
            </div>
          </div>
          <section className="panel forecast-panel">
            <div className="section-head">
              <div>
                <h2>Твоя дорога до зарплаты</h2>
                <p>Как будет меняться остаток</p>
              </div>
              <span className="subtle-pill">ПРОГНОЗ</span>
            </div>
            <div className="chart-summary">
              <div>
                <span>К {dateLabel(s.nextPay)}</span>
                <b
                  className={
                    f.result !== null && f.result < 0 ? "text-red" : ""
                  }
                >
                  {money(f.result)}
                </b>
              </div>
              <div className="chart-key">
                <i />
                Текущий темп <b>{money(f.daily)} / день</b>
              </div>
            </div>
            <ForecastChart s={s} today={today} />
            <div className="chart-foot">
              <span>
                {f.zeroDate
                  ? `Остаток может обнулиться ${dateLabel(f.zeroDate, true)}`
                  : f.result !== null
                    ? "Денег хватает на весь период"
                    : "Для прогноза нужно знать темп расходов"}
              </span>
              <button className="plain-button text-green" onClick={onDaily}>
                Уточнить темп
              </button>
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Последние операции</h2>
              <TextLink onClick={() => onPage("history")}>Вся история</TextLink>
            </div>
            {recent.length ? (
              recent.map((t) => (
                <button
                  className="transaction-row"
                  key={t.id}
                  onClick={() => onEditTx(t)}
                >
                  <CatIcon category={t.category} />
                  <div className="row-name">
                    <b>{t.note || categoryName(t.category)}</b>
                    <small>
                      {dateLabel(t.date)} ·{" "}
                      {t.type === "income"
                        ? "Поступление"
                        : categoryName(t.category)}
                    </small>
                  </div>
                  <b className={t.type === "income" ? "text-green" : ""}>
                    {t.type === "income" ? "+" : "−"}
                    {money(t.amount)}
                  </b>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <Empty title="Здесь начинается история">
                Добавь первый расход кнопкой «+ Расход».
              </Empty>
            )}
          </section>
        </div>
        <aside className="overview-side">
          <section className="panel bills-panel">
            <div className="section-head">
              <div>
                <h2>Не забыть оплатить</h2>
                <p>До {dateLabel(s.nextPay, true)}</p>
              </div>
              <span className="count-pill">{f.bills.length}</span>
            </div>
            <BillsList bills={f.bills} today={today} onPay={onPay} />
            <button className="button secondary full" onClick={onAddBill}>
              <Plus size={16} />
              Добавить платёж
            </button>
          </section>
          <section className="plan-teaser">
            <span className="teaser-icon">
              <Sparkles size={22} />
            </span>
            <span className="eyebrow">ЕСТЬ ПЛАН</span>
            <h2>
              {f.saving && f.saving > 0
                ? `${money(f.saving)} в день меняют картину`
                : "А если тратить чуть меньше?"}
            </h2>
            <p>
              {f.free !== null && f.free < 0
                ? "Сначала посмотри на обязательства и размер дефицита."
                : f.saving && f.saving > 0
                  ? "На столько нужно снизить переменные траты, чтобы закрыть прогнозируемый дефицит."
                  : "Попробуй разные сценарии и найди комфортный запас."}
            </p>
            <button onClick={() => onPage("plan")}>
              Дожить до зарплаты <ArrowRight size={18} />
            </button>
          </section>
          <section className="panel small-analytics">
            <div className="section-head">
              <h2>Куда ушли деньги</h2>
              <ArrowUpRight size={18} />
            </div>
            {a.categories.length ? (
              <>
                <div className="small-total">
                  {money(a.total)}
                  <span>с {dateLabel(s.lastPay)}</span>
                </div>
                <div className="stacked-bar">
                  {a.categories.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        width: `${(c.value / a.total) * 100}%`,
                        background: c.color,
                      }}
                    />
                  ))}
                </div>
                {a.categories.slice(0, 3).map((c) => (
                  <div className="legend-row" key={c.id}>
                    <span>
                      <i style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <b>{Math.round((c.value / a.total) * 100)}%</b>
                  </div>
                ))}
                <TextLink onClick={() => onPage("analytics")}>
                  Разобраться в расходах
                </TextLink>
              </>
            ) : (
              <Empty title="Без догадок">
                Аналитика появится после первых записей.
              </Empty>
            )}
          </section>
        </aside>
      </div>
      <details className="assumptions">
        <summary>
          <Info size={14} />
          Как мы считаем прогноз
        </summary>
        <p>
          Остаток подтверждён {dateLabel(s.opening.date, true)}
          {s.opening.estimated ? " и является приблизительным" : ""}. Расчёт
          включает сегодня и заканчивается перед днём зарплаты. Платежи в день
          зарплаты относятся к следующему периоду; просроченные учитываются
          сегодня. Будущие поступления не предполагаются.
        </p>
        <p>
          {f.rate.source === "manual"
            ? "Средние переменные траты заданы тобой."
            : f.rate.source === "history"
              ? `Среднее рассчитано по ${f.rate.days} полным дням, включая дни без записей как нулевые траты. Неполная история занижает прогноз.`
              : "Средние переменные траты ещё неизвестны."}{" "}
          Каждый будущий день считается полным. Запланированные платежи
          исключены из переменных расходов.
        </p>
      </details>
    </>
  );
}
export function AnalyticsView({ s, today }: Common) {
  const [period, setPeriod] = useState("cycle");
  let start = s.lastPay,
    end = today;
  if (period === "month") start = today.slice(0, 7) + "-01";
  if (period === "previous") {
    end = addDays(today.slice(0, 7) + "-01", -1);
    start = end.slice(0, 7) + "-01";
  }
  if (period === "all")
    start = [s.lastPay, ...s.transactions.map((t) => t.date)].sort()[0];
  const a = analytics(s, start, end),
    span = dayDiff(start, end) + 1,
    prevStart = addDays(start, -span),
    prevEnd = addDays(start, -1),
    previous = analytics(s, prevStart, prevEnd);
  const canCompare = s.trackingSince <= prevStart && previous.total > 0;
  const base = a.income || s.salary;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">В ЦИФРАХ, БЕЗ ОСУЖДЕНИЯ</div>
          <h1>Куда исчезают деньги?</h1>
          <p>Каждый вывод — из твоих записей.</p>
        </div>
        <label className="period-control">
          <span className="sr-only">Период аналитики</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="cycle">С последней зарплаты</option>
            <option value="month">Текущий месяц</option>
            <option value="previous">Прошлый месяц</option>
            <option value="all">За всё время</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Всего потрачено"
          value={money(a.total)}
          note={`${dateLabel(start)} — ${dateLabel(end)}`}
        />
        <Metric
          label={a.income ? "От записанного дохода" : "От одной зарплаты"}
          value={base ? `${Math.round((a.total / base) * 100)}%` : "—"}
          note={
            a.income
              ? "Поступления за выбранный период"
              : "Сравнение с заданной суммой выплаты"
          }
        />
        <Metric
          label="К предыдущему периоду"
          value={
            canCompare
              ? `${a.total >= previous.total ? "+" : ""}${Math.round((a.total / previous.total - 1) * 100)}%`
              : "—"
          }
          note={
            canCompare
              ? "Периоды одинаковой длины"
              : "Пока недостаточно полной истории"
          }
        />
      </div>
      {!a.total ? (
        <section className="panel">
          <Empty title="Пока нет расходов за этот период">
            Добавь расход или выбери другой период.
          </Empty>
        </section>
      ) : (
        <div className="two-columns">
          <section className="panel">
            <div className="section-head">
              <h2>Расходы по категориям</h2>
              <span className="subtle-pill">
                {a.categories.length} категорий
              </span>
            </div>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie
                    data={a.categories}
                    dataKey="value"
                    innerRadius={85}
                    outerRadius={112}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {a.categories.map((c) => (
                      <Cell fill={c.color} key={c.id} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{ background: "#edf3eb", borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span>Всего расходов</span>
                <b>{money(a.total, true)}</b>
              </div>
            </div>
            {a.categories.map((c) => (
              <div className="category-stat" key={c.id}>
                <span>
                  <i style={{ background: c.color }} />
                  {c.name}
                </span>
                <b>{money(c.value)}</b>
                <small>{Math.round((c.value / a.total) * 100)}%</small>
              </div>
            ))}
          </section>
          <div className="stack">
            <section className="panel">
              <h2>Что видно по данным</h2>
              {a.categories.slice(0, 3).map((c, i) => (
                <div className="insight-row" key={c.id}>
                  <span>0{i + 1}</span>
                  <p>
                    <b>{c.name}</b> — {Math.round((c.value / a.total) * 100)}%
                    всех расходов за период.
                  </p>
                </div>
              ))}
              {a.categories.find((c) => c.id === "credit") && base > 0 && (
                <p className="info-note">
                  Платежи по кредитам:{" "}
                  {Math.round(
                    (a.categories.find((c) => c.id === "credit")!.value /
                      base) *
                      100,
                  )}
                  % {a.income ? "записанного дохода" : "одной зарплаты"}.
                </p>
              )}
            </section>
            <section className="panel">
              <h2>Обязательное и остальное</h2>
              <div className="split-numbers">
                <div>
                  <b>{money(a.required)}</b>
                  <span>
                    Обязательные · {Math.round((a.required / a.total) * 100)}%
                  </span>
                </div>
                <div>
                  <b>{money(a.optional)}</b>
                  <span>
                    Повседневные · {Math.round((a.optional / a.total) * 100)}%
                  </span>
                </div>
              </div>
              <div className="stacked-bar">
                <span
                  style={{
                    width: `${(a.required / a.total) * 100}%`,
                    background: "#9cbf99",
                  }}
                />
                <span style={{ flex: 1, background: "#b8acdf" }} />
              </div>
              <p className="field-note">
                Классификация по твоим отметкам, а не оценка полезности покупок.
              </p>
            </section>
            <section className="panel">
              <h2>Самые крупные траты</h2>
              {[...a.tx]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 4)
                .map((t) => (
                  <div className="bill-row" key={t.id}>
                    <CatIcon category={t.category} />
                    <div className="row-name">
                      <b>{t.note || categoryName(t.category)}</b>
                      <small>{dateLabel(t.date)}</small>
                    </div>
                    <b>{money(t.amount)}</b>
                  </div>
                ))}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}
export function HistoryView({
  s,
  today,
  onEdit,
}: {
  s: FinanceState;
  today: string;
  onEdit: (t: Transaction) => void;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all");
  const tx = s.transactions
    .filter(
      (t) =>
        (category === "all" ||
          (category === "income" && t.type === "income") ||
          (t.type === "expense" && t.category === category)) &&
        `${t.note} ${categoryName(t.category)} ${t.amount / 100}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const dates = [...new Set(tx.map((t) => t.date))];
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ПРОСТО ЗАПИСЫВАЙ. МЫ ПОСЧИТАЕМ.</div>
          <h1>История денег</h1>
          <p>Расходы и поступления в одном месте.</p>
        </div>
        <span className="subtle-pill">{s.transactions.length} операций</span>
      </div>
      <div className="history-filters">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Поиск операции"
            placeholder="Найти операцию"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Категория истории"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Все операции</option>
          <option value="income">Поступления</option>
          {CATEGORIES.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <section className="panel history-panel">
        {!dates.length ? (
          <Empty title="Здесь пока тихо">
            Добавь первый расход или измени фильтр.
          </Empty>
        ) : (
          dates.map((d) => (
            <div className="history-group" key={d}>
              <div className="history-date">
                <h3>{d === today ? "Сегодня" : dateLabel(d, true)}</h3>
                <span>
                  −
                  {money(
                    tx
                      .filter((t) => t.date === d && t.type === "expense")
                      .reduce((n, t) => n + t.amount, 0),
                  )}
                </span>
              </div>
              {tx
                .filter((t) => t.date === d)
                .map((t) => (
                  <button
                    className="transaction-row"
                    key={t.id}
                    onClick={() => onEdit(t)}
                  >
                    <CatIcon category={t.category} />
                    <div className="row-name">
                      <b>{t.note || categoryName(t.category)}</b>
                      <small>
                        {t.type === "income"
                          ? "Поступление"
                          : categoryName(t.category)}
                        {t.obligationId
                          ? " · Связанный платёж"
                          : t.required
                            ? " · Обязательный"
                            : ""}
                        {t.date < s.opening.date ||
                        s.opening.excludedIds.includes(t.id)
                          ? " · Учтено в остатке"
                          : ""}
                      </small>
                    </div>
                    <b className={t.type === "income" ? "text-green" : ""}>
                      {t.type === "income" ? "+" : "−"}
                      {money(t.amount)}
                    </b>
                    <Pencil size={14} />
                  </button>
                ))}
            </div>
          ))
        )}
      </section>
    </>
  );
}
export function DebtsView({
  s,
  today,
  onAdd,
  onEdit,
  onPay,
  onRenew,
}: {
  s: FinanceState;
  today: string;
  onAdd: (kind: "bill" | "debt") => void;
  onEdit: (o: Obligation) => void;
  onPay: (o: Obligation) => void;
  onRenew: (o: Obligation) => void;
}) {
  const debts = s.obligations.filter((o) => o.kind === "debt"),
    all = [...s.obligations].sort((a, b) => a.due.localeCompare(b.due)),
    next = all.find((o) => !o.paidTxId),
    sum = debts.reduce((n, o) => n + o.total, 0);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ОБЯЗАТЕЛЬСТВА ПОД КОНТРОЛЕМ</div>
          <h1>Мои долги и платежи</h1>
          <p>Большая сумма долга и ближайший платёж — разные вещи.</p>
        </div>
        <button className="button primary" onClick={() => onAdd("debt")}>
          <Plus size={18} />
          Добавить долг
        </button>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Общая задолженность"
          value={money(sum)}
          note="Справочно · уточняй остатки по банку"
        />
        <Metric
          label="Платежи по долгам в месяц"
          value={money(debts.reduce((n, o) => n + o.amount, 0))}
          note="Сумма указанных ежемесячных платежей"
        />
        <Metric
          label="Ближайший платёж"
          value={next ? money(next.amount) : "—"}
          note={
            next
              ? `${next.name} · ${dateLabel(next.due)}`
              : "Все добавленные платежи оплачены"
          }
        />
      </div>
      <div className="section-head debts-subhead">
        <h2>План платежей</h2>
        <button className="text-link" onClick={() => onAdd("bill")}>
          <Plus size={16} />
          Добавить обычный платёж
        </button>
      </div>
      {!all.length ? (
        <section className="panel">
          <Empty title="Начни с одного платежа">
            Аренда, рассрочка или коммунальные — держи сроки в одном месте.
          </Empty>
        </section>
      ) : (
        <div className="debt-grid">
          {all.map((o) => (
            <section className="panel debt-card" key={o.id}>
              <div className="section-head">
                <CatIcon category={o.category} />
                <span
                  className={
                    "status-pill " +
                    (o.paidTxId ? "green" : o.due < today ? "amber" : "neutral")
                  }
                >
                  {o.paidTxId ? <Check size={14} /> : <Clock size={14} />}{" "}
                  {o.paidTxId
                    ? "Оплачен"
                    : o.due < today
                      ? "Срок прошёл"
                      : "Ожидается"}
                </span>
              </div>
              <h2>{o.name}</h2>
              <p>
                {o.kind === "debt"
                  ? `Остаток долга: ${money(o.total)}`
                  : "Регулярный обязательный расход"}
              </p>
              <div className="debt-payment">
                <div>
                  <span>Платёж {dateLabel(o.due)}</span>
                  <b>{money(o.amount)}</b>
                </div>
                <small>
                  {o.due < s.nextPay ? "В этом периоде" : "После зарплаты"}
                </small>
              </div>
              {o.paidTxId ? (
                <button
                  className="button secondary full"
                  onClick={() => onRenew(o)}
                >
                  <Repeat size={16} />
                  Следующий платёж
                </button>
              ) : (
                <div className="form-actions">
                  <button
                    className="button secondary"
                    aria-label={`Изменить ${o.name}`}
                    onClick={() => onEdit(o)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="button primary grow"
                    onClick={() => onPay(o)}
                  >
                    <Check size={16} />
                    Отметить оплату
                  </button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="field-note">
        После оплаты уточни остаток долга по данным банка. Новый ежемесячный
        платёж добавляется отдельно, чтобы не создавать обязательства без твоего
        подтверждения.
      </p>
    </>
  );
}
export function PlanView({
  s,
  today,
  onPay,
  onDaily,
}: Common & { onPay: (o: Obligation) => void; onDaily: () => void }) {
  const f = forecast(s, today);
  const [kind, setKind] = useState<"daily" | "delivery" | "shopping">("daily"),
    [reduction, setReduction] = useState(100000);
  const rate = scenarioRate(s, kind, reduction, today),
    after = rate === null ? null : forecast(s, today, rate);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            МАЛЕНЬКИЕ ИЗМЕНЕНИЯ. БОЛЬШЕ СПОКОЙСТВИЯ.
          </div>
          <h1>Дожить до зарплаты</h1>
          <p>Найди свой комфортный план на оставшиеся {f.days} дней.</p>
        </div>
        <span className="status-pill neutral">
          <SlidersHorizontal size={15} />
          Симуляция
        </span>
      </div>
      {f.free !== null && f.free < 0 && (
        <div className="alert-box">
          <TriangleAlert size={21} />
          <p>
            Даже без повседневных трат на обязательства не хватает{" "}
            <b>{money(-f.free)}</b>. Сценарии не устраняют этот дефицит. Проверь
            суммы и сроки платежей; если нужно, заранее обсуди условия с
            получателем платежа.
          </p>
        </div>
      )}
      <div className="two-columns">
        <section className="panel scenario-panel">
          <h2>Что, если…</h2>
          <div className="scenario-options">
            {(
              [
                [
                  "daily",
                  "Тратить меньше каждый день",
                  "Выбери комфортную сумму",
                ],
                [
                  "delivery",
                  "Сократить доставку на 50%",
                  "По средним тратам из истории",
                ],
                [
                  "shopping",
                  "Отложить необязательные покупки",
                  "До следующей зарплаты",
                ],
              ] as const
            ).map(([id, title, sub]) => (
              <button
                key={id}
                aria-pressed={kind === id}
                className={kind === id ? "selected" : ""}
                onClick={() => setKind(id)}
              >
                <span className="radio-dot" />
                <div>
                  <b>{title}</b>
                  <small>{sub}</small>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          {kind === "daily" && (
            <div className="slider-block">
              <label htmlFor="saving-slider">
                Экономия в день{" "}
                <b>{money(Math.min(reduction, f.daily ?? reduction))}</b>
              </label>
              <input
                id="saving-slider"
                type="range"
                min="0"
                max={Math.max(100000, f.daily ?? 1000000)}
                step="10000"
                value={Math.min(
                  reduction,
                  Math.max(100000, f.daily ?? 1000000),
                )}
                onChange={(e) => setReduction(Number(e.target.value))}
              />
              <div className="slider-ticks">
                <span>0 ₸</span>
                <span>{money(Math.max(100000, f.daily ?? 1000000))}</span>
              </div>
              <div className="quick-chips">
                {[50000, 100000, 200000].map((v) => (
                  <button key={v} onClick={() => setReduction(v)}>
                    −{money(v)} / день
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="info-note">
            <ShieldCheck size={20} />
            <span>
              Это только сценарий. Баланс, история и твои настройки не меняются.
            </span>
          </div>
          {rate === null && (
            <p className="form-error">
              {f.daily === null
                ? "Укажи средние ежедневные траты или веди учёт три полных дня."
                : "Для этого сценария нужны хотя бы три полных дня истории."}
            </p>
          )}
          <button className="text-link" onClick={onDaily}>
            Изменить исходный темп расходов <ArrowUpRight size={15} />
          </button>
        </section>
        <div className="stack">
          <section className="scenario-result">
            <div className="eyebrow">ПОСЛЕ ИЗМЕНЕНИЙ</div>
            <span>Остаток к зарплате</span>
            <b
              className={
                after?.result !== null &&
                after?.result !== undefined &&
                after.result < 0
                  ? "text-red"
                  : ""
              }
            >
              {money(after?.result ?? null)}
            </b>
            <p>
              {after?.result !== null &&
              after?.result !== undefined &&
              f.result !== null
                ? `На ${money(after.result - f.result)} больше текущего прогноза`
                : "Нужны баланс, будущая дата зарплаты и темп расходов"}
            </p>
            <div className="result-divider" />
            <div className="result-row">
              <span>Новый темп</span>
              <b>{money(rate)} / день</b>
            </div>
            <div className="result-row">
              <span>Безопасный лимит</span>
              <b>{money(f.limit)} / день</b>
            </div>
            <div className="result-row">
              <span>Нужно снизить хотя бы на</span>
              <b>{money(f.saving)} / день</b>
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Платежи остаются в плане</h2>
              <Landmark size={18} />
            </div>
            <BillsList bills={f.bills} today={today} onPay={onPay} />
          </section>
        </div>
      </div>
      {after && (
        <section className="panel scenario-chart">
          <div className="section-head">
            <h2>Как изменится путь</h2>
            <span className="chart-key">
              <i className="purple" />
              Сценарий <i />
              Текущий темп
            </span>
          </div>
          <ForecastChart s={s} today={today} alternative={rate ?? undefined} />
        </section>
      )}
    </>
  );
}
