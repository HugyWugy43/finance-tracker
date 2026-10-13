"use client";
import { useState, type FormEvent } from "react";
import {
  accounts,
  categories,
  dateISO,
  incomeCategories,
  parseAmount,
  validateTransaction,
  type Transaction,
} from "@/lib/finance";
import { Icon, Modal } from "./ui";
export function OperationForm({
  transaction,
  onClose,
  onSave,
  onDelete,
}: {
  transaction?: Transaction;
  onClose: () => void;
  onSave: (data: Omit<Transaction, "id">, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [type, setType] = useState<"expense" | "income">(
      transaction?.type || "expense",
    ),
    [category, setCategory] = useState(transaction?.category || "food"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const data = validateTransaction({
        ...form,
        type,
        category,
        amount: parseAmount(String(form.amount)),
      });
      setBusy(true);
      await onSave(data, transaction?.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await onDelete!(transaction!.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={transaction ? "Редактировать операцию" : "Новая операция"}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="segmented">
          <button
            type="button"
            className={type === "expense" ? "active" : ""}
            onClick={() => {
              setType("expense");
              setCategory("food");
            }}
          >
            Расход
          </button>
          <button
            type="button"
            className={type === "income" ? "active" : ""}
            onClick={() => {
              setType("income");
              setCategory("salary");
            }}
          >
            Доход
          </button>
        </div>
        <label className="amount-label">
          Сумма, ₽
          <input
            name="amount"
            inputMode="decimal"
            required
            autoFocus
            defaultValue={transaction ? transaction.amount / 100 : ""}
            placeholder="0,00"
            className="amount-input"
          />
        </label>
        <label>
          Название
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={transaction?.title}
            placeholder={
              type === "expense"
                ? "Например, продукты на неделю"
                : "Например, зарплата"
            }
          />
        </label>
        <fieldset className="category-field">
          <legend>Категория</legend>
          <div className="category-options">
            {(type === "expense" ? categories : incomeCategories).map((c) => (
              <button
                type="button"
                aria-pressed={category === c.id}
                className={category === c.id ? "selected" : ""}
                key={c.id}
                onClick={() => setCategory(c.id)}
              >
                <span style={{ background: c.color }}>
                  <Icon name={c.icon} />
                </span>
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="form-row">
          <label>
            Дата
            <input
              name="date"
              type="date"
              required
              min="1900-01-01"
              max={dateISO()}
              defaultValue={transaction?.date || dateISO()}
            />
          </label>
          <label>
            Счёт
            <select
              name="account"
              defaultValue={transaction?.account || accounts[0]}
            >
              {accounts.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy
            ? "Сохраняем…"
            : transaction
              ? "Сохранить изменения"
              : "Добавить операцию"}
        </button>
        {transaction && (
          <div className="delete-row">
            {confirm ? (
              <>
                <span>Удалить безвозвратно?</span>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setConfirm(false)}
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-button danger"
                onClick={() => setConfirm(true)}
              >
                <Icon name="trash" size={16} />
                Удалить операцию
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
export function BudgetForm({
  value,
  onClose,
  onSave,
}: {
  value: number;
  onClose: () => void;
  onSave: (n: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Бюджет на месяц" onClose={onClose}>
      <p className="form-intro">
        Установите ориентир расходов. Он применяется к каждому месяцу.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const amount = parseAmount(
            String(new FormData(e.currentTarget).get("amount")),
          );
          if (!Number.isSafeInteger(amount) || amount <= 0) {
            setError("Введите сумму больше нуля.");
            return;
          }
          setBusy(true);
          try {
            await onSave(amount);
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Сумма, ₽
          <input
            name="amount"
            defaultValue={value / 100}
            inputMode="decimal"
            required
            autoFocus
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить бюджет"}
        </button>
      </form>
    </Modal>
  );
}
