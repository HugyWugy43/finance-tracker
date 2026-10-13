"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  UserRound,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Settings2,
  Search,
  X,
  ShoppingBasket,
  ShoppingBag,
  House,
  Car,
  Headphones,
  Ellipsis,
  BriefcaseBusiness,
  Laptop,
  Gift,
  Download,
  Pencil,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  Check,
  CalendarDays,
  Orbit,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
const icons = {
  dashboard: LayoutDashboard,
  transactions: ArrowLeftRight,
  analytics: ChartNoAxesCombined,
  profile: UserRound,
  plus: Plus,
  left: ChevronLeft,
  right: ChevronRight,
  "arrow-up-right": ArrowUpRight,
  "arrow-down-left": ArrowDownLeft,
  settings: Settings2,
  search: Search,
  x: X,
  "shopping-basket": ShoppingBasket,
  "shopping-bag": ShoppingBag,
  house: House,
  car: Car,
  headphones: Headphones,
  ellipsis: Ellipsis,
  "briefcase-business": BriefcaseBusiness,
  laptop: Laptop,
  gift: Gift,
  download: Download,
  edit: Pencil,
  trash: Trash2,
  logout: LogOut,
  eye: Eye,
  "eye-off": EyeOff,
  check: Check,
  calendar: CalendarDays,
  orbit: Orbit,
  shield: ShieldCheck,
  help: CircleHelp,
};
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Component = icons[name as keyof typeof icons] || Ellipsis;
  return (
    <Component size={size} strokeWidth={1.7} aria-hidden="true" {...props} />
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
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current!,
      previous = document.activeElement as HTMLElement;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть">
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title = "Пока здесь пусто",
  description = "Добавьте первую операцию, чтобы увидеть статистику.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="orbit" size={34} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
