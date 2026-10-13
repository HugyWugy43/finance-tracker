"use client";
import { useMemo, useState, type PointerEvent } from "react";
import { aggregate, money, type Transaction } from "@/lib/finance";
import { Icon, Empty } from "./ui";
import { expenseSlices, expensePercent } from "@/lib/chart-geometry";
export function ExpenseChart({
  items,
  onCategory,
  periodLabel = "за месяц",
  keepEmptyLayout = false,
}: {
  items: Transaction[];
  onCategory: (id: string) => void;
  periodLabel?: string;
  keepEmptyLayout?: boolean;
}) {
  const data = useMemo(() => aggregate(items), [items]),
    [hover, setHover] = useState<string | null>(null),
    selected = data.categories.find((c) => c.id === hover);
  if (!data.expense && !keepEmptyLayout)
    return (
      <Empty
        title="Здесь появятся ваши расходы"
        description="Добавьте расход — и мы распределим траты по категориям."
      />
    );
  const slices = expenseSlices(data.categories, data.expense);
  const amount = (value: number) => money(value, value % 100 !== 0);
  return (
    <div className="expense-visual">
      <div className="donut-wrap">
        <svg
          viewBox="0 0 300 300"
          className="donut"
          role="img"
          aria-label={`Расходы по категориям: ${data.categories
            .filter((c) => c.total)
            .map((c) => `${c.name} ${amount(c.total)}`)
            .join(", ")}`}
        >
          <circle
            cx="150"
            cy="150"
            r="105"
            fill="none"
            stroke="var(--line)"
            strokeWidth="27"
            opacity=".3"
          />
          {slices.map((c) => (
            <g
              key={c.id}
              className="donut-slice"
              style={{ opacity: hover && hover !== c.id ? 0.65 : 1 }}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
            >
              <path
                d={c.path}
                fill="none"
                stroke={c.color}
                strokeWidth={c.strokeWidth}
                strokeLinecap="round"
              />
              <title>{`${c.name}: ${amount(c.total)} · ${expensePercent(c.total, data.expense)}`}</title>
              {c.degrees > 24 && (
                <g
                  transform={`translate(${c.mx - 9},${c.my - 9})`}
                  color="#22252a"
                >
                  <Icon name={c.icon} size={18} />
                </g>
              )}
            </g>
          ))}
          {slices
            .filter((c) => c.tiny)
            .map((c) => (
              <circle
                key={c.id}
                className="tiny-expense-marker"
                cx={c.mx}
                cy={c.my}
                r="5"
                fill={c.color}
                stroke="var(--panel)"
                strokeWidth="2"
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${c.name}: ${amount(c.total)} · ${expensePercent(c.total, data.expense)}`}</title>
              </circle>
            ))}
        </svg>
        <div className="donut-center">
          <span>{selected?.name || "Всего потрачено"}</span>
          <strong>{amount(selected?.total ?? data.expense)}</strong>
          <small>
            {selected
              ? `${expensePercent(selected.total, data.expense)} всех расходов`
              : `${items.filter((t) => t.type === "expense").length} операций ${periodLabel}`}
          </small>
        </div>
      </div>
      <div className="chart-legend">
        {data.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onCategory(c.id)}
            onFocus={() => setHover(c.id)}
            onBlur={() => setHover(null)}
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="legend-dot" style={{ background: c.color }} />
            <span>{c.name}</span>
            <strong>{amount(c.total)}</strong>
            <small>{expensePercent(c.total, data.expense)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
export function TrendChart({
  items,
  month,
  large = false,
}: {
  items: Transaction[];
  month: string;
  large?: boolean;
}) {
  const [selection, setSelection] = useState<{
    month: string;
    day: number;
  } | null>(null);
  const now = new Date(),
    currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const days =
    month === currentMonth
      ? now.getDate()
      : new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate();
  const active =
    selection?.month === month ? Math.min(selection.day, days - 1) : null;
  const choose = (day: number) =>
    setSelection({ month, day: Math.max(0, Math.min(days - 1, day)) });
  const axisDays = [
    ...new Set(
      [
        1,
        Math.round(days * 0.25),
        Math.round(days * 0.5),
        Math.round(days * 0.75),
        days,
      ].map((d) => Math.max(1, d)),
    ),
  ];
  const bins = useMemo(() => {
    const values = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      total: 0,
    }));
    for (const item of items) {
      if (item.type !== "expense" || !item.date.startsWith(month)) continue;
      const index = Number(item.date.slice(-2)) - 1;
      if (values[index]) values[index].total += item.amount;
    }
    return values;
  }, [items, month, days]);
  const max = Math.max(...bins.map((b) => b.total), 10000),
    width = large ? 860 : 420,
    height = large ? 240 : 155,
    pad = 20;
  const points = bins.map((b, i) => [
    pad + (i * (width - pad * 2)) / Math.max(1, days - 1),
    height - pad - (b.total / max) * (height - pad * 2),
  ]);
  const line = points
    .map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`)
    .join(" ");
  function pointAt(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    choose(
      Math.round(
        ((((event.clientX - box.left) / box.width) * width - pad) /
          (width - pad * 2)) *
          (days - 1),
      ),
    );
  }
  const reading =
    active === null
      ? money(bins.reduce((sum, bin) => sum + bin.total, 0))
      : money(bins[active].total, true);
  const dayLabel =
    active === null
      ? "за выбранный месяц"
      : new Date(
          `${month}-${String(active + 1).padStart(2, "0")}T12:00:00`,
        ).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return (
    <div className={`trend-chart ${large ? "large" : ""}`}>
      <div className="trend-reading" aria-live="polite">
        <strong>{reading}</strong>
        <span>{dayLabel}</span>
      </div>
      <svg
        className="trend-interactive"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Динамика ежедневных расходов. Нажмите или проведите по графику, чтобы выбрать день."
        onPointerDown={(e) => {
          pointAt(e);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" || e.buttons) pointAt(e);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <defs>
          <linearGradient
            id={large ? "trend-fill-large" : "trend-fill"}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.5, 0.8].map((n) => (
          <line
            key={n}
            x1={pad}
            x2={width - pad}
            y1={height * n}
            y2={height * n}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
        ))}
        <path
          d={`${line} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`}
          fill={`url(#${large ? "trend-fill-large" : "trend-fill"})`}
        />
        <path
          d={line}
          fill="none"
          stroke="var(--accent-strong)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {active !== null && (
          <g pointerEvents="none">
            <line
              x1={points[active][0]}
              x2={points[active][0]}
              y1="0"
              y2={height}
              stroke="var(--accent)"
              strokeDasharray="4 5"
              opacity=".6"
            />
            <circle
              cx={points[active][0]}
              cy={points[active][1]}
              r="7"
              fill="var(--accent-strong)"
              stroke="var(--panel)"
              strokeWidth="3"
            />
          </g>
        )}
        <rect width={width} height={height} fill="transparent" />
      </svg>
      <div
        className="chart-axis"
        style={{
          position: "relative",
          height: 24,
          marginLeft: `${(pad / width) * 100}%`,
          marginRight: `${(pad / width) * 100}%`,
          padding: 0,
        }}
      >
        {axisDays.map((day) => (
          <span
            key={day}
            style={{
              position: "absolute",
              left: `${days === 1 ? 0 : ((day - 1) / (days - 1)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {String(day).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="trend-controls">
        <label>
          Выбрать день
          <input
            type="range"
            aria-label="День на графике"
            aria-valuetext={`${active === null ? 1 : active + 1} число: ${money(bins[active ?? 0].total, true)}`}
            min={1}
            max={days}
            step={1}
            value={(active ?? 0) + 1}
            onFocus={() => {
              if (active === null) choose(0);
            }}
            onChange={(e) => choose(Number(e.target.value) - 1)}
          />
        </label>
        <button
          className="text-button"
          disabled={active === null}
          onClick={() => setSelection(null)}
        >
          Итог месяца
        </button>
      </div>
    </div>
  );
}
