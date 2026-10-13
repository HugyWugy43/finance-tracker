import { dateISO, type Transaction } from "./finance";
export type ExpensePeriod = "day" | "week" | "month";
export type DateRange = { from: string; to: string };
export function periodAnchor(month: string, today = dateISO()) {
  return month === today.slice(0, 7)
    ? today
    : dateISO(
        new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12),
      );
}
export function expenseRange(
  month: string,
  period: ExpensePeriod,
  anchor: string,
): DateRange {
  if (period === "month")
    return {
      from: `${month}-01`,
      to: dateISO(
        new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12),
      ),
    };
  const end = new Date(`${anchor}T12:00:00`);
  if (period === "week") end.setDate(end.getDate() + 6);
  return { from: anchor, to: dateISO(end) };
}
export function inDateRange(items: Transaction[], range: DateRange) {
  return items.filter((t) => t.date >= range.from && t.date <= range.to);
}
export function rangeLabel(range: DateRange) {
  const format = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  return range.from === range.to
    ? format(range.from)
    : `${format(range.from)} — ${format(range.to)}`;
}
