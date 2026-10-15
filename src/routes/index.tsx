import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, NotebookPen, ListChecks, CalendarClock } from "lucide-react";
import { PageHeader, Panel, PriorityBadge } from "@/components/common";
import { priorityRank, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — WorkPilot" },
      { name: "description", content: "Your AI workspace overview: open tasks, recent meetings and email drafts." },
      { property: "og:title", content: "Dashboard — WorkPilot" },
      { property: "og:description", content: "Your AI workspace overview: open tasks, recent meetings and email drafts." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const tasks = useStore((s) => s.tasks);
  const meetings = useStore((s) => s.meetings);
  const emails = useStore((s) => s.emails);
  const open = tasks.filter((t) => t.status !== "done");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = open.filter((t) => t.due && t.due < today).length;
  const upcoming = [...open].sort((a, b) => (a.due || "9").localeCompare(b.due || "9") || priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 5);
  const done = tasks.length ? Math.round(((tasks.length - open.length) / tasks.length) * 100) : 0;

  const stats = [
    { label: "Open tasks", value: open.length, icon: ListChecks },
    { label: "Overdue", value: overdue, icon: CalendarClock },
    { label: "Meetings summarized", value: meetings.length, icon: NotebookPen },
    { label: "Saved emails", value: emails.length, icon: Mail },
  ];

  return (
    <>
      <PageHeader eyebrow="Overview" title="Good to see you." description="Turn meetings into tasks, tasks into a plan, and outcomes into emails — all in one place." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="p-4 md:p-5">
            <s.icon className="size-5 text-primary" />
            <div className="mt-3 font-display text-3xl">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">Up next</h2>
            <Link to="/tasks" className="text-sm font-medium text-primary hover:underline">All tasks</Link>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${done}%` }} />
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{done}% of tasks complete</p>
          <ul className="divide-y">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className={t.due && t.due < today ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                    {t.due ? `Due ${t.due}` : "No deadline"}{t.scheduledFor ? ` · Scheduled ${t.scheduledFor}` : ""}
                  </div>
                </div>
                <PriorityBadge p={t.priority} />
              </li>
            ))}
            {!upcoming.length && <li className="py-6 text-center text-sm text-muted-foreground">Nothing open. Nice work.</li>}
          </ul>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-xl">Recent meetings</h2>
          <ul className="space-y-3">
            {meetings.slice(0, 3).map((m) => (
              <li key={m.id} className="rounded-lg bg-muted p-3">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.date} · {m.actionItems.length} action items</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { to: "/email" as const, title: "Draft an email", text: "Pick a tone and purpose, get a polished draft.", icon: Mail },
          { to: "/meetings" as const, title: "Summarize a meeting", text: "Paste notes, get decisions and action items.", icon: NotebookPen },
          { to: "/tasks" as const, title: "Plan my week", text: "Let AI prioritize and schedule your tasks.", icon: ListChecks },
        ].map((c) => (
          <Link key={c.to} to={c.to} className="group rounded-xl border bg-primary p-5 text-primary-foreground shadow-card transition hover:-translate-y-0.5">
            <c.icon className="size-5 text-accent" />
            <div className="mt-3 font-display text-lg">{c.title}</div>
            <p className="mt-1 text-sm text-primary-foreground/75">{c.text}</p>
            <ArrowRight className="mt-3 size-4 transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </>
  );
}
