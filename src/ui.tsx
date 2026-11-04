import {
  useEffect,
  useRef,
  type ReactNode,
  type InputHTMLAttributes,
  type ChangeEvent,
} from "react";
import {
  BarChart3,
  X,
  ShoppingBasket,
  Coffee,
  UtensilsCrossed,
  Car,
  Landmark,
  House,
  PartyPopper,
  ShoppingBag,
  Repeat,
  Ellipsis,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { categoryName, type Category } from "./model";
export function Brand() {
  return (
    <a
      className="brand"
      href="#home"
      aria-label="Куда исчезает зарплата — главная"
    >
      <span className="brand-icon">
        <BarChart3 size={23} />
      </span>
      <span>
        куда зарплата<span className="brand-dot">?</span>
        <small>ДЕНЬГИ СТАЛИ ПОНЯТНЕЕ</small>
      </span>
    </a>
  );
}
export const icons = {
  food: ShoppingBasket,
  cafe: Coffee,
  delivery: UtensilsCrossed,
  transport: Car,
  credit: Landmark,
  home: House,
  fun: PartyPopper,
  shopping: ShoppingBag,
  subscriptions: Repeat,
  other: Ellipsis,
};
export function CatIcon({ category }: { category: Category }) {
  const I = icons[category];
  return (
    <span className={"cat-icon cat-" + category}>
      <I size={19} aria-label={categoryName(category)} />
    </span>
  );
}
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...props}
        onInput={
          props.type === "date"
            ? (e) =>
                props.onChange?.(e as unknown as ChangeEvent<HTMLInputElement>)
            : props.onInput
        }
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function MoneyField(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
  },
) {
  return (
    <Field inputMode="decimal" placeholder="0" autoComplete="off" {...props} />
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    el?.querySelector<HTMLInputElement>(
      "input:not([type=checkbox]):not([type=radio]), select",
    )?.focus();
    return () => el?.close();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="section-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BarChart3 size={27} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Privacy() {
  return (
    <span className="privacy">
      <ShieldCheck size={15} /> Данные только в твоём браузере
    </span>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
