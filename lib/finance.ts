export type Transaction = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  title: string;
  date: string;
  account: string;
};
export type Profile = {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  budget: number;
};
export const categories = [
  { id: "food", name: "Продукты", color: "#c6ef76", icon: "shopping-basket" },
  { id: "shopping", name: "Покупки", color: "#b6a1f2", icon: "shopping-bag" },
  { id: "home", name: "Дом", color: "#89c5ee", icon: "house" },
  { id: "transport", name: "Транспорт", color: "#f5b878", icon: "car" },
  { id: "fun", name: "Досуг", color: "#f3a5cb", icon: "headphones" },
  { id: "other", name: "Другое", color: "#929ba6", icon: "ellipsis" },
];
export const incomeCategories = [
  {
    id: "salary",
    name: "Зарплата",
    color: "#c6ef76",
    icon: "briefcase-business",
  },
  { id: "freelance", name: "Подработка", color: "#89c5ee", icon: "laptop" },
  { id: "gift", name: "Другой доход", color: "#b6a1f2", icon: "gift" },
];
export const allCategories = [...categories, ...incomeCategories];
export const accounts = ["Основной счёт", "Наличные"];
export const money = (cents: number, decimals = false) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(cents / 100);
export const dateISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const monthKey = (d = new Date()) => dateISO(d).slice(0, 7);
export function parseAmount(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}
export function passwordStrength(p: string) {
  return (
    Number(p.length >= 8) +
    Number(p.length >= 12) +
    Number(/[a-zа-я]/i.test(p) && /\d/.test(p)) +
    Number(/[^\p{L}\p{N}]/u.test(p) && /[A-ZА-Я]/.test(p))
  );
}
export function aggregate(items: Transaction[]) {
  const income = items
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = items
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  return {
    income,
    expense,
    balance: income - expense,
    categories: categories
      .map((c) => ({
        ...c,
        total: items
          .filter((t) => t.type === "expense" && t.category === c.id)
          .reduce((s, t) => s + t.amount, 0),
      }))
      .sort((a, b) => b.total - a.total),
  };
}
export function validateTransaction(body: unknown): Omit<Transaction, "id"> {
  if (!body || typeof body !== "object")
    throw new Error("Заполните данные операции.");
  const b = body as Record<string, unknown>;
  if (b.type !== "expense" && b.type !== "income")
    throw new Error("Выберите тип операции.");
  if (
    !Number.isSafeInteger(b.amount) ||
    Number(b.amount) <= 0 ||
    Number(b.amount) > 99999999999
  )
    throw new Error("Введите сумму от 0,01 до 999 999 999,99 ₽.");
  if (
    typeof b.title !== "string" ||
    !b.title.trim() ||
    b.title.trim().length > 100
  )
    throw new Error("Название должно содержать от 1 до 100 символов.");
  if (
    typeof b.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
    !Number.isFinite(new Date(b.date).getTime()) ||
    new Date(b.date).toISOString().slice(0, 10) !== b.date ||
    b.date < "1900-01-01" ||
    b.date > dateISO()
  )
    throw new Error("Укажите существующую дату не позднее сегодня.");
  if (
    !(b.type === "expense" ? categories : incomeCategories).some(
      (c) => c.id === b.category,
    )
  )
    throw new Error("Выберите категорию.");
  if (!accounts.includes(String(b.account))) throw new Error("Выберите счёт.");
  return {
    type: b.type,
    amount: Number(b.amount),
    category: String(b.category),
    title: b.title.trim(),
    date: b.date,
    account: String(b.account),
  };
}
export function makeDemo(now = new Date()): Transaction[] {
  const month = monthKey(now),
    day = now.getDate();
  const entries: Array<[string, string, number, number, "expense" | "income"]> =
    [
      ["Зарплата", "salary", 85000, 1, "income"],
      ["Аренда квартиры", "home", 12000, 2, "expense"],
      ["Перекрёсток", "food", 2450, day, "expense"],
      ["Кофе и завтрак", "food", 580, day, "expense"],
      ["Яндекс Go", "transport", 420, day, "expense"],
      ["Новые кроссовки", "shopping", 6490, Math.max(1, day - 1), "expense"],
      ["Подписка Яндекс Плюс", "fun", 399, Math.max(1, day - 1), "expense"],
      ["Продукты на неделю", "food", 4270, 3, "expense"],
      ["Тройка", "transport", 1800, 2, "expense"],
      ["Ужин с друзьями", "fun", 1860, Math.max(1, day - 2), "expense"],
      ["Аптека", "other", 1051, Math.max(1, day - 2), "expense"],
    ];
  const result = entries.map(([title, category, rubles, d, type], i) => ({
    id: `demo-${i}`,
    title,
    category,
    amount: rubles * 100,
    date: `${month}-${String(Math.min(d, day)).padStart(2, "0")}`,
    type,
    account: accounts[0],
  }));
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  result.push({
    id: "demo-previous",
    title: "Доход прошлого месяца",
    category: "salary",
    amount: 7100000,
    date: dateISO(previous),
    type: "income",
    account: accounts[0],
  });
  return result;
}
