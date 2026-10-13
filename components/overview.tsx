"use client";

import { useEffect, useRef, useState } from "react";
import {
  expenseRange,
  inDateRange,
  periodAnchor,
  rangeLabel,
  type ExpensePeriod,
  type DateRange,
} from "@/lib/expense-period";
import { aggregate, dateISO, money, type Transaction } from "@/lib/finance";
import { ExpenseChart, TrendChart } from "./charts";
import { Icon } from "./ui";
import { OrbitStar } from "./brand";
import { TransactionList } from "./transaction-list";

type Props = {
  monthly: Transaction[];
  items: Transaction[];
  latest: Transaction[];
  balance: number;
  budget: number;
  month: string;
  demo: boolean;
  onEdit: (transaction: Transaction) => void;
  onCategory: (category: string, range?: DateRange) => void;
  onBudget: () => void;
  onTransactions: () => void;
  onAnalytics: () => void;
  onRegister: () => void;
};

export function Overview(props: Props) {
  const { monthly, latest, balance, budget, month, demo } = props;
  const [period, setPeriod] = useState<ExpensePeriod>("month"),
    [anchor, setAnchor] = useState(() => periodAnchor(month)),
    [weekStart, setWeekStart] = useState(() => {
      const date = new Date(`${periodAnchor(month)}T12:00:00`);
      date.setDate(date.getDate() - 6);
      return dateISO(date);
    });
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = panelRef.current?.animate(
      [{ opacity: 0.65 }, { opacity: 1 }],
      { duration: 300, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [period, anchor, weekStart]);
  const activeAnchor = period === "week" ? weekStart : anchor;
  const range = expenseRange(month, period, activeAnchor),
    periodItems = inDateRange(props.items, range);
  const summary = aggregate(monthly);
  const used = budget > 0 ? Math.round((summary.expense / budget) * 100) : 0;
  const remaining = budget - summary.expense;

  return (
    <div className="overview-grid">
      <section className="hero-balance" aria-label="Сводка финансов">
        <div className="hero-topline">
          <span>
            <i />
            ВАШ КАПИТАЛ
          </span>
          <OrbitStar size={31} />
        </div>
        <div className="hero-balance-copy">
          <span className="balance-label">Общий баланс</span>
          <strong className="hero-amount">{money(balance)}</strong>
          <span className="balance-caption">
            На всех счетах · российский рубль
          </span>
        </div>
        <div className="balance-glass-art" aria-hidden="true">
          <i className="prism-beam" />
          <div className="glass-orb">
            <OrbitStar size={140} />
          </div>
          <span className="orbit-outline" />
        </div>
        <div className="hero-bottomline">
          <span>На своей орбите.</span>
          <span>ORBIT PERSONAL ↗</span>
        </div>
        <div className="cashflow-summary">
          <div>
            <span>
              <Icon name="arrow-down-left" size={18} />
              Доходы за месяц
            </span>
            <strong>{money(summary.income)}</strong>
          </div>
          <div>
            <span>
              <Icon name="arrow-up-right" size={18} />
              Расходы за месяц
            </span>
            <strong>{money(summary.expense)}</strong>
          </div>
        </div>
      </section>

      <section className="panel budget-panel overview-budget">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">ВАШ ПЛАН</span>
            <h2>Бюджет месяца</h2>
          </div>
          <button
            className="round-link"
            onClick={props.onBudget}
            aria-label="Изменить бюджет"
          >
            <Icon name="settings" size={19} />
          </button>
        </div>
        <div className="budget-callout">
          <span>
            {remaining < 0 ? "Превышение бюджета" : "Можно потратить ещё"}
          </span>
          <strong>
            {money(Math.abs(remaining))}
            <Icon name="arrow-up-right" size={28} />
          </strong>
        </div>
        <div className="budget-meter-label">
          <span>Использовано</span>
          <strong>{used}%</strong>
        </div>
        <div
          className="budget-progress"
          role="progressbar"
          aria-label="Использовано бюджета"
          aria-valuenow={Math.min(used, 100)}
          aria-valuetext={`${used}%`}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            style={{
              width: `${Math.min(used, 100)}%`,
              background: remaining < 0 ? "var(--danger)" : undefined,
            }}
          />
        </div>
        <div className="budget-values">
          <span>
            {money(summary.expense)}
            <small>потрачено</small>
          </span>
          <span>
            {money(budget)}
            <small>лимит на месяц</small>
          </span>
        </div>
        <div className={`budget-tip ${remaining < 0 ? "over" : ""}`}>
          <Icon name={remaining < 0 ? "help" : "check"} size={18} />
          <p>
            {remaining < 0
              ? "Вы вышли за лимит. Пересмотрите план расходов."
              : "Всё по плану. Продолжайте в своём темпе."}
          </p>
        </div>
      </section>

      <section className="panel recent-panel overview-recent">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">ИСТОРИЯ</span>
            <h2>Последние операции</h2>
          </div>
          <button
            className="round-link"
            onClick={props.onTransactions}
            aria-label="Все операции"
          >
            <Icon name="arrow-up-right" size={20} />
          </button>
        </div>
        <TransactionList items={latest} onEdit={props.onEdit} compact />
        <div className="recent-footer">
          <Icon name="shield" size={16} />
          <span>
            {demo
              ? "Пример данных. Личный учёт начнётся с чистого листа."
              : "Ваши записи доступны только вам."}
          </span>
          {demo && (
            <button className="text-button" onClick={props.onRegister}>
              Создать аккаунт
            </button>
          )}
        </div>
      </section>

      <section ref={panelRef} className="panel expense-panel overview-expenses">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">СТАТИСТИКА</span>
            <h2>Куда уходят деньги</h2>
          </div>
        </div>
        <div
          className="expense-period"
          role="group"
          aria-label="Период расходов"
        >
          {(["day", "week", "month"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {{ day: "День", week: "Неделя", month: "Месяц" }[value]}
            </button>
          ))}
        </div>
        <div className="expense-range">
          <span>{rangeLabel(range)}</span>
          <label
            className={period === "month" ? "is-placeholder" : undefined}
            aria-hidden={period === "month"}
          >
            {period === "day" ? "Дата" : "Неделя с"}
            <input
              type="date"
              aria-label={
                period === "day" ? "Дата расходов" : "Первый день недели"
              }
              value={activeAnchor}
              disabled={period === "month"}
              tabIndex={period === "month" ? -1 : undefined}
              max={dateISO()}
              onChange={(e) => {
                if (e.target.value && e.target.value <= dateISO())
                  (period === "week" ? setWeekStart : setAnchor)(
                    e.target.value,
                  );
              }}
            />
          </label>
        </div>
        <ExpenseChart
          keepEmptyLayout
          key={`${period}-${activeAnchor}`}
          items={periodItems}
          periodLabel={
            period === "day"
              ? "за день"
              : period === "week"
                ? "за неделю"
                : "за месяц"
          }
          onCategory={(id) => props.onCategory(id, range)}
        />
        <div className="panel-caption">
          <Icon name="help" size={15} />
          <span>Выберите категорию, чтобы посмотреть операции</span>
        </div>
      </section>

      <section className="panel overview-trend">
        <div className="trend-intro">
          <span className="section-kicker">ДИНАМИКА</span>
          <h2>Финансовый ритм</h2>
          <p>Ваши расходы день за днём</p>
          <button className="text-button" onClick={props.onAnalytics}>
            Открыть аналитику <Icon name="arrow-up-right" size={16} />
          </button>
        </div>
        <TrendChart items={monthly} month={month} large />
      </section>
    </div>
  );
}
