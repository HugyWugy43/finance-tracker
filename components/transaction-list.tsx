"use client";
import { allCategories, money, type Transaction } from "@/lib/finance";
import { Icon, Empty } from "./ui";
export function TransactionList({
  items,
  onEdit,
  compact = false,
}: {
  items: Transaction[];
  onEdit: (t: Transaction) => void;
  compact?: boolean;
}) {
  return items.length ? (
    <div className={`transaction-list ${compact ? "compact" : ""}`}>
      {items.map((t) => {
        const cat = allCategories.find((c) => c.id === t.category)!;
        return (
          <button
            className="transaction-row"
            key={t.id}
            onClick={() => onEdit(t)}
            aria-label={`Редактировать: ${t.title}, ${money(t.amount)}`}
          >
            <span className="transaction-main">
              <span
                className="transaction-icon"
                style={{ "--category-color": cat.color } as React.CSSProperties}
              >
                <Icon name={cat.icon} size={20} />
              </span>
              <span>
                <strong>{t.title}</strong>
                <small>{compact ? cat.name : t.account}</small>
              </span>
            </span>
            {!compact && (
              <span className="transaction-category">{cat.name}</span>
            )}
            <span className="transaction-date">
              {new Date(`${t.date}T12:00:00`).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <strong
              className={`transaction-amount ${t.type === "income" ? "income-text" : ""}`}
            >
              {t.type === "income" ? "+" : "−"}
              {money(t.amount, true)}
            </strong>
            {!compact && <Icon name="edit" size={16} className="edit-icon" />}
          </button>
        );
      })}
    </div>
  ) : (
    <Empty
      title="Операций пока нет"
      description="Добавьте новую операцию или измените период и фильтры."
    />
  );
}
