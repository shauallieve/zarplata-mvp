import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { forecast, money, type FinanceState } from "./model";
import { downloadFile } from "./storage";
export default function ShareCard({
  state,
  today,
  demo,
}: {
  state: FinanceState;
  today: string;
  demo: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState({
    salary: false,
    balance: false,
    debt: false,
  });
  const [error, setError] = useState("");
  const f = forecast(state, today);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = 1080,
      h = 1350;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111713";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2b3b2e";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(920, 210, 130 + i * 75, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#b6efad";
    ctx.beginPath();
    ctx.arc(970, 210, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 33px system-ui";
    ctx.fillText("куда зарплата?", 80, 112);
    ctx.fillStyle = "#9ca99f";
    ctx.font = "23px system-ui";
    ctx.fillText(
      demo ? "ДЕМО · ТЕСТОВЫЕ ДАННЫЕ" : "МОЙ ЗАРПЛАТНЫЙ ДИАГНОЗ",
      80,
      200,
    );
    ctx.fillStyle = "#f1f5ee";
    ctx.font = "bold 94px system-ui";
    ctx.fillText("Деньги любят", 80, 350);
    ctx.fillStyle = "#b6efad";
    ctx.fillText("ясность.", 80, 470);
    ctx.fillStyle = "#26342a";
    ctx.fillRect(80, 555, 920, 2);
    ctx.fillStyle = "#f1f5ee";
    ctx.font = "bold 150px system-ui";
    ctx.fillText(String(f.days), 80, 750);
    ctx.font = "35px system-ui";
    ctx.fillStyle = "#aab7ad";
    ctx.fillText("дней до зарплаты", 80, 813);
    ctx.font = "bold 40px system-ui";
    ctx.fillStyle = "#d9e4d8";
    const lines =
      f.result === null
        ? ["Я разбираюсь, куда уходят деньги."]
        : f.result < 0
          ? [
              "Я увидел, где нужен новый план.",
              "И могу изменить его уже сегодня.",
            ]
          : ["Я знаю свой дневной лимит.", "И спокойнее смотрю вперёд."];
    lines.forEach((v, i) => ctx.fillText(v, 80, 925 + i * 58));
    let y = 1100;
    ctx.font = "27px system-ui";
    ctx.fillStyle = "#aab7ad";
    if (show.salary) {
      ctx.fillText("Одна выплата: " + money(state.salary), 80, y);
      y += 42;
    }
    if (show.balance) {
      ctx.fillText("Баланс: " + money(f.current), 80, y);
      y += 42;
    }
    if (show.debt) {
      ctx.fillText(
        "Долги: " +
          money(
            state.obligations
              .filter((o) => o.kind === "debt")
              .reduce((n, o) => n + o.total, 0),
          ),
        80,
        y,
      );
      y += 42;
    }
    if (!Object.values(show).some(Boolean)) {
      ctx.fillText("Личные суммы остаются личными.", 80, y);
    }
    ctx.fillStyle = "#617667";
    ctx.font = "22px system-ui";
    ctx.fillText("Куда исчезает зарплата? · Финансовая ясность", 80, 1280);
  }, [state, today, show, demo]);
  function save() {
    try {
      ref.current?.toBlob((b) => {
        if (b) downloadFile(b, "moy-zarplatny-diagnoz.png");
        else setError("Не удалось создать PNG. Попробуйте ещё раз.");
      }, "image/png");
    } catch {
      setError("Браузер не разрешил сохранить изображение.");
    }
  }
  return (
    <div className="share-layout">
      <canvas
        ref={ref}
        width="1080"
        height="1350"
        className="share-preview"
        aria-label="Предпросмотр карточки с финансовым результатом"
      />
      <div>
        <p className="info-note">
          <ShieldCheck size={19} />
          По умолчанию зарплата, баланс и долги скрыты.
        </p>
        <h3>Какие суммы добавить?</h3>
        {(
          [
            ["salary", "Размер одной зарплаты"],
            ["balance", "Текущий баланс"],
            ["debt", "Общий долг"],
          ] as const
        ).map(([key, label]) => (
          <label className="check-label" key={key}>
            <input
              type="checkbox"
              checked={show[key]}
              onChange={(e) => setShow({ ...show, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <button className="button primary full" onClick={save}>
          <Download size={18} />
          Скачать PNG
        </button>
        <p className="field-note">
          1080 × 1350 · Подходит для Threads.
          <br />
          Ничего не публикуется автоматически.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
