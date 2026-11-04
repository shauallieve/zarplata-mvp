import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Landmark,
  Sparkles,
  Settings,
  Share2,
  Plus,
  ArrowDownLeft,
  ShieldCheck,
  LogOut,
  Check,
  Download,
  Upload,
  RotateCcw,
  Wallet,
  TriangleAlert,
  X,
  ArrowRight,
  Play,
} from "lucide-react";
import Onboarding from "./Onboarding";
import ShareCard from "./ShareCard";
import { Brand, Modal, MoneyField, ErrorText, Privacy } from "./ui";
import {
  TransactionForm,
  ObligationForm,
  PaymentForm,
  SalaryForm,
} from "./Forms";
import {
  Overview,
  AnalyticsView,
  HistoryView,
  DebtsView,
  PlanView,
  type Page,
} from "./Views";
import {
  todayISO,
  blankState,
  demoState,
  forecast,
  parseMoney,
  balance,
  validateState,
  payObligation,
  deleteTransaction,
  reconcile,
  uid,
  money,
  dateLabel,
  type FinanceState,
  type Transaction,
  type Obligation,
} from "./model";
import { loadState, saveState, downloadFile, KEY } from "./storage";
const NAV = [
  { id: "home", label: "Обзор", icon: LayoutDashboard },
  { id: "analytics", label: "Аналитика", icon: ChartNoAxesCombined },
  { id: "history", label: "Операции", icon: ArrowLeftRight },
  { id: "debts", label: "Мои долги", icon: Landmark },
  { id: "plan", label: "До зарплаты", icon: Sparkles },
] as const;
type ModalState =
  | { type: "expense" | "income"; tx?: Transaction }
  | { type: "bill" | "debt" | "renew" | "pay"; bill?: Obligation }
  | { type: "balance" | "daily" | "salary" | "share" | "settings" }
  | { type: "confirm"; title: string; text: string; action: () => void };
function initial() {
  try {
    return loadState(window.localStorage);
  } catch {
    return {
      state: null,
      warning: "Хранилище браузера недоступно. Используй экспорт данных.",
    };
  }
}
export default function App() {
  const [loaded] = useState(initial);
  const [state, setState] = useState<FinanceState | null>(loaded.state),
    [demo, setDemo] = useState<FinanceState | null>(null),
    [warning, setWarning] = useState<string | null>(loaded.warning),
    [toast, setToast] = useState(""),
    [page, setPage] = useState<Page>("home"),
    [modal, setModal] = useState<ModalState | null>(null),
    [today, setToday] = useState(todayISO);
  const s = demo ?? state;
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 30000);
    const visible = () => setToday(todayISO());
    window.addEventListener("focus", visible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", visible);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === KEY) {
        try {
          const next = e.newValue
            ? validateState(JSON.parse(e.newValue))
            : null;
          setState(next);
          setModal(null);
          setToast("Данные обновлены в другой вкладке.");
        } catch {
          setWarning(
            "Другая вкладка записала некорректные данные. Текущая копия сохранена в памяти.",
          );
        }
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  useEffect(() => {
    const listener = () => {
      const p = location.hash.slice(1) as Page;
      if (NAV.some((n) => n.id === p)) setPage(p);
    };
    listener();
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  function go(p: Page) {
    setPage(p);
    location.hash = p;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function commit(next: FinanceState, message = "Сохранено") {
    try {
      const n = validateState({ ...next, revision: Date.now() });
      if (demo) {
        setDemo(n);
      } else {
        setState(n);
        try {
          saveState(localStorage, n);
          setWarning(null);
        } catch {
          setWarning(
            "Изменения есть только в памяти: браузер не смог сохранить их. Скачай резервную копию в настройках.",
          );
        }
      }
      setToast(message);
      return true;
    } catch (e) {
      setWarning((e as Error).message);
      return false;
    }
  }
  function startDemo() {
    setDemo(demoState(today));
    setModal(null);
    go("home");
    setToast("Демо включено. Это тестовые суммы.");
  }
  function confirm(title: string, text: string, action: () => void) {
    setModal({ type: "confirm", title, text, action });
  }
  function editTx(t: Transaction) {
    if (t.obligationId) {
      confirm(
        "Отменить отметку об оплате?",
        `Связанный платёж «${t.note}» нельзя редактировать отдельно. Отмена удалит эту операцию и снова зарезервирует платёж. Если запись учтена в подтверждённом остатке, сам остаток не изменится.`,
        () => {
          if (s)
            commit(deleteTransaction(s, t.id), "Отметка об оплате отменена");
          setModal(null);
        },
      );
    } else setModal({ type: t.type, tx: t });
  }
  function saveTx(t: Transaction, inOpening: boolean) {
    if (!s) return;
    const excluded = s.opening.excludedIds.filter((id) => id !== t.id);
    if (inOpening) excluded.push(t.id);
    const next = {
      ...s,
      opening: { ...s.opening, excludedIds: excluded },
      transactions: [...s.transactions.filter((x) => x.id !== t.id), t],
    };
    if (commit(next, "Операция сохранена")) setModal(null);
  }
  function saveBill(o: Obligation, renew: boolean) {
    if (!s) return;
    const next = {
      ...s,
      obligations: [...s.obligations.filter((x) => x.id !== o.id), o],
      transactions: renew
        ? s.transactions.map((t) =>
            t.obligationId === o.id ? { ...t, obligationId: undefined } : t,
          )
        : s.transactions,
    };
    if (commit(next, "Платёж сохранён")) setModal(null);
  }
  function removeBill(o: Obligation) {
    if (!s) return;
    confirm(
      "Удалить платёж?",
      `«${o.name}» больше не будет резервироваться в бюджете.`,
      () => {
        commit(
          { ...s, obligations: s.obligations.filter((x) => x.id !== o.id) },
          "Платёж удалён",
        );
        setModal(null);
      },
    );
  }
  function pay(o: Obligation, date: string, existingId?: string) {
    if (!s || o.paidTxId) return;
    let next = s;
    if (existingId) {
      const t = s.transactions.find(
        (t) =>
          t.id === existingId &&
          t.amount === o.amount &&
          t.type === "expense" &&
          !t.obligationId,
      );
      if (!t) return;
      next = {
        ...s,
        transactions: s.transactions.map((x) =>
          x.id === existingId
            ? { ...x, obligationId: o.id, required: true, category: o.category }
            : x,
        ),
        obligations: s.obligations.map((x) =>
          x.id === o.id ? { ...x, paidTxId: existingId } : x,
        ),
      };
    } else next = payObligation(s, o.id, date);
    if (commit(next, "Оплата отмечена. Повторного списания нет."))
      setModal(null);
  }
  const payModal = (bill: Obligation) => setModal({ type: "pay", bill });
  const modals = modal && (
    <Modal
      title={
        modal.type === "confirm"
          ? modal.title
          : {
              expense:
                modal.type === "expense" && modal.tx
                  ? "Изменить расход"
                  : "Новый расход",
              income:
                modal.type === "income" && modal.tx
                  ? "Изменить поступление"
                  : "Новое поступление",
              bill: "Обязательный платёж",
              debt: "Кредит или долг",
              renew: "Следующий платёж",
              pay: "Отметить оплату",
              balance: "Подтвердить остаток",
              daily: "Средние траты в день",
              salary: "Зарплата и период",
              share: "Мой зарплатный диагноз",
              settings: "Настройки и данные",
            }[modal.type]
      }
      onClose={() => setModal(null)}
      wide={modal.type === "share"}
    >
      {(modal.type === "expense" || modal.type === "income") && s && (
        <TransactionForm
          state={s}
          existing={modal.tx}
          type={modal.type === "income" ? "income" : "expense"}
          onSave={saveTx}
          onDelete={
            modal.tx
              ? () =>
                  confirm(
                    "Удалить операцию?",
                    "Она исчезнет из истории и аналитики. Баланс пересчитается, если операция не была учтена в подтверждённом остатке.",
                    () => {
                      commit(
                        deleteTransaction(s, modal.tx!.id),
                        "Операция удалена",
                      );
                      setModal(null);
                    },
                  )
              : undefined
          }
        />
      )}
      {(modal.type === "bill" ||
        modal.type === "debt" ||
        modal.type === "renew") && (
        <ObligationForm
          existing={modal.bill}
          kind={modal.type === "debt" ? "debt" : "bill"}
          renew={modal.type === "renew"}
          onSave={saveBill}
          onDelete={
            modal.bill && modal.type !== "renew"
              ? () => removeBill(modal.bill!)
              : undefined
          }
        />
      )}
      {modal.type === "pay" && modal.bill && s && (
        <PaymentForm
          state={s}
          bill={modal.bill}
          onPay={(date, id) => pay(modal.bill!, date, id)}
        />
      )}
      {modal.type === "balance" && s && (
        <SimpleMoney
          label="Доступно сейчас на всех счетах и наличными, ₸"
          initial={balance(s, today)}
          negative
          note="Новый остаток уже включает все существующие операции. Они сохранятся в истории и не будут вычтены повторно."
          onSave={(n) => {
            if (
              n !== null &&
              commit(reconcile(s, n, today), "Остаток подтверждён")
            )
              setModal(null);
          }}
        />
      )}
      {modal.type === "daily" && s && (
        <SimpleMoney
          label="Повседневные расходы сверх запланированных платежей, ₸ / день"
          initial={s.daily}
          allowEmpty
          note="Пустое поле включает среднее по истории после трёх полных дней. Веди все повседневные расходы: пропущенные записи занижают прогноз."
          onSave={(n) => {
            if (commit({ ...s, daily: n }, "Темп расходов обновлён"))
              setModal(null);
          }}
        />
      )}
      {modal.type === "salary" && s && (
        <SalaryForm
          state={s}
          onSave={(amount, lastPay, nextPay, frequency, received) => {
            const tx: Transaction = {
              id: uid(),
              type: "income",
              category: "other",
              date: lastPay,
              amount,
              note: "Зарплата",
              required: false,
            };
            const next = {
              ...s,
              salary: amount,
              lastPay,
              nextPay,
              frequency,
              transactions: received ? [...s.transactions, tx] : s.transactions,
            };
            if (
              commit(next, received ? "Зарплата записана" : "Период обновлён")
            )
              setModal(null);
          }}
        />
      )}
      {modal.type === "share" && s && (
        <ShareCard state={s} today={today} demo={!!demo} />
      )}
      {modal.type === "settings" && (
        <SettingsContent
          state={s}
          demo={!!demo}
          onDemo={startDemo}
          onImport={(n) =>
            confirm(
              "Восстановить из файла?",
              "Текущие записи будут заменены данными из выбранного файла. Если они нужны, сначала скачай резервную копию.",
              () => {
                if (commit(n, "Данные восстановлены")) setModal(null);
              },
            )
          }
          onEdit={(type) => setModal({ type })}
          onReset={() =>
            confirm(
              "Начать заново?",
              "Текущие данные этого браузера будут удалены. Сначала скачай резервную копию, если хочешь сохранить историю.",
              () => {
                if (demo) {
                  setDemo(null);
                } else {
                  try {
                    localStorage.removeItem(KEY);
                    localStorage.removeItem(KEY + ":backup");
                    setState(null);
                    setWarning(null);
                  } catch {
                    setWarning("Браузер не разрешил очистить данные.");
                  }
                }
                setModal(null);
                go("home");
              },
            )
          }
        />
      )}
      {modal.type === "confirm" && (
        <>
          <p className="confirm-copy">{modal.text}</p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Отмена
            </button>
            <button className="button primary grow" onClick={modal.action}>
              Подтвердить
            </button>
          </div>
        </>
      )}
    </Modal>
  );
  const notices = (
    <>
      {warning && (
        <div className="storage-warning" role="alert">
          <TriangleAlert size={18} />
          <span>{warning}</span>
          <button onClick={() => setModal({ type: "settings" })}>Данные</button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
  if (!s)
    return (
      <>
        {notices}
        <Onboarding
          onFinish={(n) => {
            if (commit(n, "Твоя финансовая картина готова")) go("home");
          }}
          onDemo={startDemo}
          onSettings={() => setModal({ type: "settings" })}
        />
        {modals}
      </>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="nav-caption">ЛИЧНЫЙ БЮДЖЕТ</div>
        <nav aria-label="Основная навигация">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
              key={id}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "plan" && <i className="nav-spark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={22} />
            <b>
              Твои деньги.
              <br />
              Только твои данные.
            </b>
            <p>Без банковских подключений и регистрации.</p>
          </div>
          <button
            className="nav-utility"
            onClick={() => setModal({ type: "share" })}
          >
            <Share2 size={19} />
            Мой диагноз
            <ArrowRight size={15} />
          </button>
          <button
            className="nav-utility"
            onClick={() => setModal({ type: "settings" })}
          >
            <Settings size={19} />
            Настройки
          </button>
          <div className="profile">
            <span>₸</span>
            <div>
              <b>Личный бюджет</b>
              <small>Казахстан · KZT</small>
            </div>
            <span className="profile-status" />
          </div>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-header">
          <div className="desktop-breadcrumb">
            Моё пространство <span>/</span>{" "}
            <b>{NAV.find((n) => n.id === page)?.label}</b>
          </div>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="header-actions">
            <span className="header-date">{dateLabel(today, true)}</span>
            <button
              className="icon-button"
              onClick={() => setModal({ type: "share" })}
              aria-label="Мой зарплатный диагноз"
            >
              <Share2 size={19} />
            </button>
            <button
              className="icon-button mobile-settings"
              onClick={() => setModal({ type: "settings" })}
              aria-label="Настройки"
            >
              <Settings size={19} />
            </button>
            <button
              className="button secondary income-button"
              aria-label="Добавить доход"
              onClick={() => setModal({ type: "income" })}
            >
              <ArrowDownLeft size={17} />
              Доход
            </button>
            <button
              className="button primary expense-button"
              onClick={() => setModal({ type: "expense" })}
            >
              <Plus size={19} />
              Расход
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <Play size={13} />
              <b>Демо-режим</b> · Все суммы — тестовые
            </span>
            <button
              onClick={() => {
                setDemo(null);
                go("home");
              }}
            >
              Перейти к своим данным <ArrowRight size={15} />
            </button>
          </div>
        )}
        {notices}
        <main className="app-main" id="main-content">
          {page === "home" && (
            <Overview
              s={s}
              today={today}
              onPage={go}
              onPay={payModal}
              onAddBill={() => setModal({ type: "bill" })}
              onBalance={() => setModal({ type: "balance" })}
              onDaily={() => setModal({ type: "daily" })}
              onSalary={() => setModal({ type: "salary" })}
              onEditTx={editTx}
            />
          )}
          {page === "analytics" && <AnalyticsView s={s} today={today} />}
          {page === "history" && (
            <HistoryView s={s} today={today} onEdit={editTx} />
          )}
          {page === "debts" && (
            <DebtsView
              s={s}
              today={today}
              onAdd={(type) => setModal({ type })}
              onEdit={(bill) =>
                setModal({ type: bill.kind === "debt" ? "debt" : "bill", bill })
              }
              onPay={payModal}
              onRenew={(bill) => setModal({ type: "renew", bill })}
            />
          )}
          {page === "plan" && (
            <PlanView
              s={s}
              today={today}
              onPay={payModal}
              onDaily={() => setModal({ type: "daily" })}
            />
          )}
          <footer className="app-footer">
            <Privacy />
            <span>Ясность — уже первый шаг.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            className={page === id ? "active" : ""}
            onClick={() => go(id)}
            key={id}
            aria-current={page === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button
        className="mobile-add button primary"
        aria-label="Быстро добавить расход"
        onClick={() => setModal({ type: "expense" })}
      >
        <Plus size={20} />
        Расход
      </button>
      {modals}
    </div>
  );
}
function SimpleMoney({
  label,
  initial,
  negative = false,
  allowEmpty = false,
  note,
  onSave,
}: {
  label: string;
  initial: number | null;
  negative?: boolean;
  allowEmpty?: boolean;
  note: string;
  onSave: (n: number | null) => void;
}) {
  const [value, setValue] = useState(
      initial === null ? "" : String(initial / 100),
    ),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSave(
            allowEmpty && !value.trim()
              ? null
              : parseMoney(value, { negative }),
          );
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <MoneyField
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        required={!allowEmpty}
      />
      <p className="info-note">{note}</p>
      <ErrorText message={error} />
      <button className="button primary full">Сохранить</button>
    </form>
  );
}
function SettingsContent({
  state,
  demo,
  onImport,
  onDemo,
  onReset,
  onEdit,
}: {
  state: FinanceState | null;
  demo: boolean;
  onImport: (s: FinanceState) => void;
  onDemo: () => void;
  onReset: () => void;
  onEdit: (type: "balance" | "daily" | "salary" | "share") => void;
}) {
  const ref = useRef<HTMLInputElement>(null),
    [error, setError] = useState("");
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw Error("Максимальный размер копии — 5 МБ.");
      onImport(validateState(JSON.parse(await file.text())));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="settings-content">
      {state && (
        <>
          <div className="settings-section">
            <h3>Финансовые настройки</h3>
            {(
              [
                ["balance", "Подтвердить текущий остаток"],
                ["salary", "Зарплата и даты выплат"],
                ["daily", "Средние ежедневные расходы"],
                ["share", "Мой зарплатный диагноз · PNG"],
              ] as const
            ).map(([id, text]) => (
              <button
                className="settings-row"
                key={id}
                onClick={() => onEdit(id)}
              >
                <span>{text}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          <div className="settings-section">
            <h3>Резервная копия</h3>
            <p>
              Данные хранятся в этом браузере и не синхронизируются между
              устройствами. Копия поможет сохранить историю при очистке
              браузера.
            </p>
            <button
              className="button secondary full"
              onClick={() =>
                downloadFile(
                  JSON.stringify(state, null, 2),
                  demo ? "salary-demo.json" : "salary-backup.json",
                )
              }
            >
              <Download size={17} />
              Скачать данные JSON
            </button>
          </div>
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        className="button secondary full"
        onClick={() => ref.current?.click()}
      >
        <Upload size={17} />
        Восстановить из JSON
      </button>
      <ErrorText message={error} />
      <details>
        <summary>Восстановление повреждённой записи</summary>
        <p>
          Можно скачать исходную запись, если автоматическое восстановление не
          сработало.
        </p>
        <button
          className="button secondary full"
          onClick={() => {
            try {
              const raw =
                localStorage.getItem(KEY + ":damaged") ??
                localStorage.getItem(KEY);
              if (raw) downloadFile(raw, "salary-recovery.txt", "text/plain");
              else setError("Сохранённая запись не найдена.");
            } catch {
              setError("Доступ к хранилищу запрещён.");
            }
          }}
        >
          Скачать исходную запись
        </button>
      </details>
      <div className="settings-section">
        <h3>Посмотреть, как всё работает</h3>
        <button className="button secondary full" onClick={onDemo}>
          <Play size={16} />
          {demo ? "Начать демо заново" : "Открыть демо с тестовыми данными"}
        </button>
        <p>Демо не меняет твои сохранённые данные.</p>
      </div>
      {state && (
        <button className="button danger full" onClick={onReset}>
          <RotateCcw size={16} />
          {demo ? "Выйти из демо" : "Начать заново"}
        </button>
      )}
      <p className="field-note">
        Прогноз опирается на введённые данные, а не на доступ к банковским
        счетам. При изменении дохода или платежей обновляй план.
      </p>
    </div>
  );
}
