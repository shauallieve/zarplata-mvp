import { type FinanceState, validateState } from "./model";
export const KEY = "salary-compass:v1";
export function loadState(storage: Storage): {
  state: FinanceState | null;
  warning: string | null;
} {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { state: null, warning: null };
    try {
      return { state: validateState(JSON.parse(raw)), warning: null };
    } catch {
      const backup = storage.getItem(KEY + ":backup");
      if (backup) {
        try {
          return {
            state: validateState(JSON.parse(backup)),
            warning:
              "Основная запись повреждена. Восстановлена последняя резервная копия.",
          };
        } catch {}
      }
      return {
        state: null,
        warning:
          "Не удалось прочитать сохранённые данные. Исходная запись сохранена; можно скачать её в настройках.",
      };
    }
  } catch {
    return {
      state: null,
      warning:
        "Браузер запретил доступ к хранилищу. Экспортируйте данные перед закрытием.",
    };
  }
}
export function saveState(storage: Storage, s: FinanceState) {
  validateState(s);
  const old = storage.getItem(KEY);
  if (old) {
    try {
      validateState(JSON.parse(old));
      storage.setItem(KEY + ":backup", old);
    } catch {
      storage.setItem(KEY + ":damaged", old);
    }
  }
  storage.setItem(KEY, JSON.stringify(s));
}
export function downloadFile(
  data: string | Blob,
  name: string,
  type = "application/json",
) {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
