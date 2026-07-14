import Link from "next/link";
import {
  getAllRemindersServer,
  getInquiriesServer,
  getCompaniesServer,
  getProjectsServer,
  getContractsServer,
  type ReminderRecord,
} from "@/lib/supabase-server";
import { toDateKey } from "@/lib/reminder-helpers";
import CalendarBoard from "./calendar-board";

// Live calendar/reminders data must never be statically prerendered at build
// time — this route has no dynamic segment to force it, the same reasoning
// as every other /admin/* dashboard route.
export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const parseMonthParam = (value: string | undefined) => {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { year, month: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const monthParam = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthQuery } = await searchParams;
  const { year, month } = parseMonthParam(monthQuery);

  const [reminders, inquiries, companies, projects, contracts] = await Promise.all([
    getAllRemindersServer().catch(() => []),
    getInquiriesServer().catch(() => []),
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getContractsServer().catch(() => []),
  ]);

  const remindersByDate = new Map<string, ReminderRecord[]>();
  for (const reminder of reminders) {
    const key = toDateKey(reminder.due_at);
    if (!remindersByDate.has(key)) remindersByDate.set(key, []);
    remindersByDate.get(key)!.push(reminder);
  }

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push({ day: null, dateKey: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: toDateKey(new Date(year, month, day)) });
  }

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const todayKey = toDateKey(new Date());

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Amber Global Energy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Calendar &amp; Follow-Ups</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Every scheduled follow-up reminder across inquiries, companies, projects, and contracts.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href={`/admin/calendar?month=${monthParam(prevMonth.year, prevMonth.month)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              ← Prev
            </Link>
            <h2 className="text-lg font-semibold text-white">{MONTH_NAMES[month]} {year}</h2>
            <Link
              href={`/admin/calendar?month=${monthParam(nextMonth.year, nextMonth.month)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Next →
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.15em] text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="py-1">{label}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              const dayReminders = cell.dateKey ? remindersByDate.get(cell.dateKey) ?? [] : [];
              const isToday = cell.dateKey === todayKey;

              return (
                <div
                  key={index}
                  className={`min-h-[84px] rounded-xl border p-1.5 text-left ${cell.day ? "border-white/10 bg-[#071A2D]/70" : "border-transparent"} ${isToday ? "border-[#C8A24D]/50" : ""}`}
                >
                  {cell.day ? (
                    <>
                      <p className={`text-xs ${isToday ? "font-semibold text-[#F0D38A]" : "text-slate-400"}`}>{cell.day}</p>
                      <div className="mt-1 space-y-0.5">
                        {dayReminders.slice(0, 2).map((reminder) => (
                          <p key={reminder.id} className="truncate rounded bg-[#C8A24D]/12 px-1 py-0.5 text-[9px] text-[#F0D38A]">
                            {reminder.title}
                          </p>
                        ))}
                        {dayReminders.length > 2 ? (
                          <p className="text-[9px] text-slate-500">+{dayReminders.length - 2} more</p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <CalendarBoard
          initialReminders={reminders}
          inquiries={inquiries}
          companies={companies}
          projects={projects}
          contracts={contracts}
        />
      </div>
    </main>
  );
}
