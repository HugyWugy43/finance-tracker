"use client";
import { useEffect, useMemo, useState } from "react";
import {
  aggregate,
  allCategories,
  makeDemo,
  money,
  monthKey,
  type Profile,
  type Transaction,
} from "@/lib/finance";
import { api } from "@/lib/api";
import { Icon } from "./ui";
import { BudgetForm, OperationForm } from "./forms";
import { AuthScreen } from "./auth-screen";
import { OrbitLogo, OrbitStar } from "./brand";
import { inDateRange, rangeLabel, type DateRange } from "@/lib/expense-period";
import { ExpenseChart, TrendChart } from "./charts";
import { ProfileView, GuestProfile } from "./profile-view";
import { Overview } from "./overview";
import { TransactionList } from "./transaction-list";
const tabs = [
  { id: "dashboard", name: "Обзор" },
  { id: "transactions", name: "Операции" },
  { id: "analytics", name: "Аналитика" },
  { id: "profile", name: "Личный кабинет" },
];
type View = "dashboard" | "transactions" | "analytics" | "profile";
function monthLabel(value: string) {
  return new Date(`${value}-01T12:00:00`)
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
}
export default function FinanceApp() {
  const [view, setView] = useState<View>("dashboard"),
    [profile, setProfile] = useState<Profile | null>(null),
    [items, setItems] = useState<Transaction[]>([]),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState("");
  const [month, setMonthValue] = useState(monthKey()),
    [operation, setOperation] = useState<Transaction | "new" | null>(null),
    [auth, setAuth] = useState<"register" | "login" | null>(null),
    [budgetOpen, setBudgetOpen] = useState(false),
    [demoBudget, setDemoBudget] = useState(5000000),
    [toast, setToast] = useState(""),
    [search, setSearchValue] = useState(""),
    [typeFilter, setTypeFilterValue] = useState("all"),
    [categoryFilter, setCategoryFilterValue] = useState("all"),
    [page, setPage] = useState(1);
  const [periodFilter, setPeriodFilterValue] = useState<DateRange | null>(null);
  // Reset pagination in the same event, without a second render from an effect.
  function setSearch(value: string) {
    setSearchValue(value);
    setPage(1);
  }
  function setTypeFilter(value: string) {
    setTypeFilterValue(value);
    setPage(1);
  }
  function setCategoryFilter(value: string) {
    setCategoryFilterValue(value);
    setPage(1);
  }
  function setPeriodFilter(value: DateRange | null) {
    setPeriodFilterValue(value);
    setPage(1);
  }
  function setMonth(value: string) {
    setMonthValue(value);
    setPeriodFilter(null);
  }
  const demo = !profile,
    budget = profile?.budget ?? demoBudget;
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.removeItem("orbit-theme");
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function load() {
    setLoadError("");
    try {
      const r = await fetch("/api/me");
      if (r.status === 401) {
        setItems(makeDemo());
        setProfile(null);
        if (new URLSearchParams(location.search).get("demo") !== "1")
          setAuth("login");
      } else if (r.ok) {
        const { user } = (await r.json()) as { user: Profile };
        const data = await api<{ transactions: Transaction[] }>(
          "/api/transactions",
        );
        setProfile(user);
        setItems(data.transactions);
        setAuth(null);
      } else throw new Error("Не удалось загрузить аккаунт.");
    } catch {
      setLoadError(
        "Не удалось загрузить данные. Проверьте подключение и попробуйте ещё раз.",
      );
    } finally {
      const v = new URLSearchParams(location.search).get("view");
      if (tabs.some((t) => t.id === v)) setView(v as View);
      setReady(true);
    }
  }
  function navigate(id: View) {
    setView(id);
    window.scrollTo({ top: 0, behavior: "instant" });
    history.replaceState(null, "", `?view=${id}${demo ? "&demo=1" : ""}`);
  }
  const monthly = useMemo(
      () => items.filter((t) => t.date.startsWith(month)),
      [items, month],
    ),
    summary = useMemo(() => aggregate(monthly), [monthly]),
    total = useMemo(() => aggregate(items), [items]);
  const sorted = useMemo(
    () => [...monthly].sort((a, b) => b.date.localeCompare(a.date)),
    [monthly],
  );
  const filtered = (
    periodFilter
      ? inDateRange(items, periodFilter).sort((a, b) =>
          b.date.localeCompare(a.date),
        )
      : sorted
  ).filter(
    (t) =>
      (typeFilter === "all" || t.type === typeFilter) &&
      (categoryFilter === "all" || t.category === categoryFilter) &&
      `${t.title} ${allCategories.find((c) => c.id === t.category)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const latest = sorted.slice(0, 5),
    pages = Math.max(1, Math.ceil(filtered.length / 10));
  function selectCategory(id: string, range?: DateRange) {
    setPeriodFilter(range ?? null);
    setCategoryFilter(id);
    setTypeFilter("expense");
    navigate("transactions");
  }
  function changeMonth(offset: number) {
    const d = new Date(`${month}-01T12:00:00`);
    d.setMonth(d.getMonth() + offset);
    setMonth(monthKey(d));
  }
  async function save(data: Omit<Transaction, "id">, id?: string) {
    let t: Transaction;
    if (demo) t = { ...data, id: id || crypto.randomUUID() };
    else
      t = (
        await api<{ transaction: Transaction }>(
          id ? `/api/transactions/${id}` : "/api/transactions",
          id ? "PATCH" : "POST",
          data,
        )
      ).transaction;
    setItems((prev) =>
      id ? prev.map((x) => (x.id === id ? t : x)) : [t, ...prev],
    );
    setMonth(t.date.slice(0, 7));
    setToast(
      demo
        ? "Операция добавлена в деморежиме. После обновления она исчезнет."
        : id
          ? "Изменения сохранены"
          : "Операция добавлена",
    );
  }
  async function remove(id: string) {
    if (!demo) await api(`/api/transactions/${id}`, "DELETE", {});
    setItems((prev) => prev.filter((t) => t.id !== id));
    setToast("Операция удалена");
  }
  async function authenticated(p: Profile) {
    setAuth(null);
    setProfile(p);
    setItems([]);
    setPeriodFilter(null);
    setMonth(monthKey());
    setCategoryFilter("all");
    setTypeFilter("all");
    setSearch("");
    setView("dashboard");
    history.replaceState(null, "", "?view=dashboard");
    try {
      const data = await api<{ transactions: Transaction[] }>(
        "/api/transactions",
      );
      setItems(data.transactions);
      setLoadError("");
      setToast("Вы вошли в аккаунт");
    } catch {
      setLoadError(
        "Аккаунт открыт, но операции не загрузились. Попробуйте ещё раз.",
      );
    }
  }
  async function logout() {
    try {
      await api("/api/auth/logout", "POST", {});
      setProfile(null);
      setItems(makeDemo());
      setAuth("login");
      history.replaceState(null, "", "/");
      setToast("");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function saveBudget(value: number) {
    if (demo) setDemoBudget(value);
    else {
      await api("/api/budget", "PATCH", { budget: value });
      setProfile((p) => (p ? { ...p, budget: value } : p));
    }
    setToast(demo ? "Бюджет изменён для демопросмотра" : "Бюджет сохранён");
  }
  function exportCSV() {
    const cell = (v: string) =>
      `"${(/^[=+@\-]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
    const csv =
      "\uFEFF" +
      [
        ["Дата", "Название", "Тип", "Категория", "Сумма, ₽", "Счёт"],
        ...filtered.map((t) => [
          t.date,
          t.title,
          t.type === "expense" ? "Расход" : "Доход",
          allCategories.find((c) => c.id === t.category)?.name || "",
          String(t.amount / 100).replace(".", ","),
          t.account,
        ]),
      ]
        .map((row) => row.map(cell).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Файл с операциями скачан");
  }

  if (!ready)
    return (
      <main className="boot-screen">
        <OrbitLogo />
        <span className="spinner" />
        <p>Открываем вашу орбиту…</p>
      </main>
    );
  if (auth)
    return (
      <AuthScreen
        key={auth}
        initial={auth}
        onSuccess={authenticated}
        onDemo={() => {
          setAuth(null);
          navigate("dashboard");
        }}
      />
    );
  return (
    <>
      <div className="ambient-scene app-ambient" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <button
            className="brand"
            onClick={() => navigate("dashboard")}
            aria-label="ORBIT — на главную"
          >
            <OrbitLogo compact />
          </button>
          <div className="sidebar-caption">ЛИЧНЫЕ ФИНАНСЫ</div>
          <nav aria-label="Основная навигация">
            {tabs.map((t) => (
              <button
                key={t.id}
                aria-label={t.name}
                title={t.name}
                className={`nav-link ${view === t.id ? "active" : ""}`}
                aria-current={view === t.id ? "page" : undefined}
                onClick={() => navigate(t.id as View)}
              >
                <Icon name={t.id} />
                <span>{t.name}</span>
                {view === t.id && <span className="nav-indicator" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="rail-caption">YOUR ORBIT</span>
            <OrbitStar size={25} />
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <OrbitLogo />
              <span className="breadcrumb-divider">/</span>
              <strong>{tabs.find((t) => t.id === view)?.name}</strong>
            </div>
            <div
              className={`topbar-actions ${demo ? "is-guest" : "is-account"}`}
            >
              {demo ? (
                <>
                  <span className="demo-badge">Деморежим</span>
                  <button
                    className="text-button sign-in"
                    onClick={() => setAuth("login")}
                  >
                    Войти
                  </button>
                </>
              ) : (
                <span className="saved-status">
                  <Icon name="check" size={14} />
                  Всё сохранено
                </span>
              )}
              <button
                className="avatar"
                onClick={() =>
                  demo ? setAuth("register") : navigate("profile")
                }
                aria-label={demo ? "Создать аккаунт" : "Открыть профиль"}
              >
                {profile ? (
                  profile.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                ) : (
                  <Icon name="profile" size={20} />
                )}
              </button>
            </div>
          </header>
          <main id="main">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  {view === "dashboard"
                    ? `ВАША ФИНАНСОВАЯ ОРБИТА`
                    : view === "transactions"
                      ? "КАЖДАЯ ДЕТАЛЬ ВАЖНА"
                      : view === "analytics"
                        ? "ОТ ЦИФР К ПРИВЫЧКАМ"
                        : "ВАШЕ ПРОСТРАНСТВО"}
                </div>
                <h1>
                  {view === "dashboard"
                    ? "Финансы на вашей орбите."
                    : view === "transactions"
                      ? "История операций"
                      : view === "analytics"
                        ? "Финансы в деталях"
                        : "Личный кабинет"}
                </h1>
                <p>
                  {view === "dashboard"
                    ? "Меньше неопределённости. Больше возможностей."
                    : view === "transactions"
                      ? "Все доходы и расходы в одном месте."
                      : view === "analytics"
                        ? "Замечайте, куда уходят деньги."
                        : "Настройте ORBIT под себя."}
                </p>
              </div>
              <div className="heading-actions">
                {view !== "profile" && (
                  <>
                    <div className="month-picker">
                      <button
                        onClick={() => changeMonth(-1)}
                        aria-label="Предыдущий месяц"
                      >
                        <Icon name="left" size={15} />
                      </button>
                      <label>
                        <Icon name="calendar" size={17} />
                        <span>{monthLabel(month)}</span>
                        <input
                          type="month"
                          value={month}
                          max={monthKey()}
                          aria-label="Месяц статистики"
                          onChange={(e) => {
                            if (e.target.value) setMonth(e.target.value);
                          }}
                        />
                      </label>
                      <button
                        onClick={() => changeMonth(1)}
                        disabled={month >= monthKey()}
                        aria-label="Следующий месяц"
                      >
                        <Icon name="right" size={15} />
                      </button>
                    </div>
                    <button
                      className="button primary add-operation"
                      onClick={() => setOperation("new")}
                    >
                      <Icon name="plus" size={18} />
                      <span>Добавить операцию</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            {!ready ? (
              <div className="loading-state">
                <span className="spinner" />
                Загружаем вашу орбиту…
              </div>
            ) : loadError ? (
              <div className="error-panel" role="alert">
                <p>{loadError}</p>
                <button className="button primary" onClick={load}>
                  Попробовать снова
                </button>
              </div>
            ) : (
              <>
                {view === "dashboard" && (
                  <Overview
                    key={month}
                    items={items}
                    monthly={monthly}
                    latest={latest}
                    balance={total.balance}
                    budget={budget}
                    month={month}
                    demo={demo}
                    onEdit={setOperation}
                    onCategory={selectCategory}
                    onBudget={() => setBudgetOpen(true)}
                    onTransactions={() => {
                      setPeriodFilter(null);
                      setCategoryFilter("all");
                      setTypeFilter("all");
                      navigate("transactions");
                    }}
                    onAnalytics={() => navigate("analytics")}
                    onRegister={() => setAuth("register")}
                  />
                )}
                {view === "transactions" && (
                  <section className="panel operations-panel">
                    {periodFilter && (
                      <div className="range-filter">
                        <span>Период: {rangeLabel(periodFilter)}</span>
                        <button
                          className="text-button"
                          onClick={() => setPeriodFilter(null)}
                        >
                          Показать весь месяц <Icon name="x" size={16} />
                        </button>
                      </div>
                    )}
                    <div className="operations-toolbar">
                      <div className="search-field">
                        <Icon name="search" size={18} />
                        <input
                          placeholder="Найти операцию…"
                          aria-label="Поиск операций"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <select
                        aria-label="Тип операции"
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value);
                          setCategoryFilter("all");
                        }}
                      >
                        <option value="all">Все операции</option>
                        <option value="expense">Расходы</option>
                        <option value="income">Доходы</option>
                      </select>
                      <select
                        aria-label="Категория операции"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">Все категории</option>
                        {allCategories
                          .filter(
                            (c) =>
                              typeFilter === "all" ||
                              (typeFilter === "expense"
                                ? allCategories.indexOf(c) < 6
                                : allCategories.indexOf(c) >= 6),
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <button
                        className="button secondary"
                        onClick={exportCSV}
                        disabled={!filtered.length}
                      >
                        <Icon name="download" size={17} />
                        Экспорт
                      </button>
                    </div>
                    <div className="table-labels">
                      <span>Операция</span>
                      <span>Категория</span>
                      <span>Дата</span>
                      <span>Сумма</span>
                      <span />
                    </div>
                    <TransactionList
                      items={filtered.slice((page - 1) * 10, page * 10)}
                      onEdit={setOperation}
                    />
                    <div className="table-footer">
                      <span>Найдено: {filtered.length}</span>
                      <div>
                        <button
                          className="icon-button"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                          aria-label="Предыдущая страница"
                        >
                          <Icon name="left" size={16} />
                        </button>
                        <span>
                          {page} / {pages}
                        </span>
                        <button
                          className="icon-button"
                          disabled={page >= pages}
                          onClick={() => setPage((p) => p + 1)}
                          aria-label="Следующая страница"
                        >
                          <Icon name="right" size={16} />
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                {view === "analytics" && (
                  <div className="analytics-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Структура расходов</h2>
                        <span className="soft-badge">{monthLabel(month)}</span>
                      </div>
                      <ExpenseChart
                        items={monthly}
                        onCategory={selectCategory}
                      />
                    </section>
                    <section className="panel insights-panel">
                      <h2>Месяц в цифрах</h2>
                      <div>
                        <span>Самая затратная категория</span>
                        <strong>
                          {summary.expense
                            ? summary.categories[0].name
                            : "Нет расходов"}
                        </strong>
                        <small>
                          {summary.expense
                            ? money(summary.categories[0].total)
                            : "Добавьте первую операцию"}
                        </small>
                      </div>
                      <div>
                        <span>Остаток доходов за месяц</span>
                        <strong
                          className={
                            summary.balance < 0 ? "danger" : "income-text"
                          }
                        >
                          {money(summary.balance)}
                        </strong>
                        <small>Доходы минус расходы</small>
                      </div>
                      <div>
                        <span>Средний расход на операцию</span>
                        <strong>
                          {money(
                            summary.expense /
                              Math.max(
                                1,
                                monthly.filter((t) => t.type === "expense")
                                  .length,
                              ),
                          )}
                        </strong>
                      </div>
                    </section>
                    <section className="panel full-width">
                      <div className="panel-heading">
                        <h2>Динамика расходов</h2>
                        <span className="soft-badge">По дням</span>
                      </div>
                      <TrendChart items={monthly} month={month} large />
                    </section>
                  </div>
                )}
                {view === "profile" &&
                  (demo ? (
                    <GuestProfile
                      onRegister={() => setAuth("register")}
                      onLogin={() => setAuth("login")}
                    />
                  ) : (
                    <ProfileView
                      profile={profile}
                      onSave={(p) => {
                        setProfile(p);
                        setToast("Профиль обновлён");
                      }}
                      onLogout={logout}
                    />
                  ))}
              </>
            )}
            <footer className="page-footer">
              <span>
                <OrbitStar size={19} />
                Ваши финансы на одной орбите
              </span>
              <span>Внесение операций вручную · RUB</span>
            </footer>
          </main>
        </div>
      </div>
      {operation && (
        <OperationForm
          transaction={operation === "new" ? undefined : operation}
          onClose={() => setOperation(null)}
          onSave={save}
          onDelete={remove}
        />
      )}{" "}
      {budgetOpen && (
        <BudgetForm
          value={budget}
          onClose={() => setBudgetOpen(false)}
          onSave={saveBudget}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Скрыть уведомление">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
