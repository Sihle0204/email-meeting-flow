import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck, Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, PageHeader, Panel, PriorityBadge, errMsg } from "@/components/common";
import { planTasks } from "@/lib/ai.functions";
import { priorityRank, setState, uid, useStore, type Priority, type Status, type Task } from "@/lib/store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — WorkPilot" },
      { name: "description", content: "Create, prioritize and schedule tasks with AI based on deadlines and importance." },
      { property: "og:title", content: "AI Task Planner — WorkPilot" },
      { property: "og:description", content: "Create, prioritize and schedule tasks with AI based on deadlines and importance." },
    ],
  }),
  component: TasksPage,
});

const blank = (): Task => ({ id: "", title: "", description: "", priority: "medium", due: "", status: "todo", estimate: 1 });
const COLS: { key: Status; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const navigate = useNavigate();
  const [edit, setEdit] = useState<Task | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  function saveTask() {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.title.trim()) e.title = "Title is required.";
    if (edit.title.length > 300) e.title = "Keep the title under 300 characters.";
    if (!(edit.estimate > 0 && edit.estimate <= 100)) e.estimate = "Estimate must be between 0 and 100 hours.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const t = { ...edit, id: edit.id || uid() };
    setState((s) => ({ tasks: edit.id ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [t, ...s.tasks] }));
    setEdit(null);
    toast.success(edit.id ? "Task updated" : "Task added");
  }

  async function plan() {
    const open = tasks.filter((t) => t.status !== "done");
    if (!open.length) return toast.error("No open tasks to plan.");
    setLoading(true);
    try {
      const r = await planTasks({ data: { hoursPerDay: hours, tasks: open.map(({ id, title, due, priority, estimate }) => ({ id, title, due, priority, estimate })) } });
      const map = new Map(r.plan.map((p) => [p.id, p]));
      setState((s) => ({
        tasks: s.tasks.map((t) => {
          const p = map.get(t.id);
          return p ? { ...t, priority: (["high", "medium", "low"].includes(p.priority) ? p.priority : t.priority) as Priority, scheduledFor: p.scheduledFor, reason: p.reason } : t;
        }),
      }));
      setAdvice(r.advice);
      toast.success("Your schedule is ready");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  function emailAbout(t: Task) {
    setState(() => ({
      emailContext: {
        purpose: "Status update",
        recipient: "",
        keyPoints: `Update on task: ${t.title}. Status: ${t.status.replace("_", " ")}.`,
        context: `${t.description}\nPriority: ${t.priority}${t.due ? `\nDue: ${t.due}` : ""}${t.scheduledFor ? `\nScheduled: ${t.scheduledFor}` : ""}`,
      },
    }));
    navigate({ to: "/email" });
  }

  const sorted = [...tasks].sort((a, b) => (a.scheduledFor || a.due || "9").localeCompare(b.scheduledFor || b.due || "9") || priorityRank[a.priority] - priorityRank[b.priority]);

  return (
    <>
      <PageHeader
        eyebrow="AI Task Planner"
        title="Know what to do, and when."
        description="Add tasks or import them from meetings. The assistant prioritizes by deadline and importance, then schedules them across your week."
        actions={<Button onClick={() => { setErrors({}); setEdit(blank()); }}><Plus /> New task</Button>}
      />

      <Panel className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <h2 className="text-xl">Auto-schedule</h2>
          <p className="text-sm text-muted-foreground">{advice || "Prioritize and schedule all open tasks around your available focus time."}</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="h">Focus hours / day</Label>
            <Input id="h" type="number" min={1} max={16} className="mt-1.5 w-28" value={hours} onChange={(e) => setHours(Math.min(16, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <Button size="lg" onClick={plan} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <CalendarCheck />} {loading ? "Planning…" : "Plan my week"}</Button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map((c) => {
          const list = sorted.filter((t) => t.status === c.key);
          return (
            <div key={c.key} className="rounded-xl bg-muted/70 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-lg">{c.label}</h3>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              <div className="grid gap-3">
                {list.map((t) => (
                  <div key={t.id} className="rounded-lg border bg-card p-3 shadow-card">
                    <div className="flex items-start gap-2">
                      <Checkbox className="mt-1" checked={t.status === "done"} aria-label="Mark done" onCheckedChange={(v) => setState((s) => ({ tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, status: v ? "done" : "todo" } : x)) }))} />
                      <div className="min-w-0 flex-1">
                        <div className={t.status === "done" ? "font-medium text-muted-foreground line-through" : "font-medium"}>{t.title}</div>
                        {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
                      </div>
                      <PriorityBadge p={t.priority} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {t.due && <span className={t.due < today && t.status !== "done" ? "text-destructive" : ""}>Due {t.due}</span>}
                      <span>{t.estimate}h</span>
                      {t.scheduledFor && <span className="font-medium text-primary">Scheduled {t.scheduledFor}</span>}
                    </div>
                    {t.reason && <p className="mt-2 rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">{t.reason}</p>}
                    <div className="mt-2 flex items-center gap-1">
                      <select aria-label="Status" className="mr-auto rounded-md border bg-card px-2 py-1 text-xs" value={t.status} onChange={(e) => setState((s) => ({ tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, status: e.target.value as Status } : x)) }))}>
                        {COLS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                      <Button variant="ghost" size="icon" aria-label="Draft email" onClick={() => emailAbout(t)}><Mail /></Button>
                      <Button variant="ghost" size="icon" aria-label="Edit task" onClick={() => { setErrors({}); setEdit(t); }}><Pencil /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => setState((s) => ({ tasks: s.tasks.filter((x) => x.id !== t.id) }))}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
                {!list.length && <p className="px-1 py-4 text-center text-sm text-muted-foreground">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{edit?.id ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div>
                <Label htmlFor="tt">Title *</Label>
                <Input id="tt" className="mt-1.5" maxLength={300} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                <FieldError msg={errors.title} />
              </div>
              <div>
                <Label htmlFor="td">Description</Label>
                <Textarea id="td" className="mt-1.5" maxLength={1000} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="tp">Priority</Label>
                  <select id="tp" className="mt-1.5 h-9 w-full rounded-md border bg-card px-2 text-sm" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value as Priority })}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="tdu">Due</Label>
                  <Input id="tdu" type="date" className="mt-1.5" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="te">Hours</Label>
                  <Input id="te" type="number" step="0.5" className="mt-1.5" value={edit.estimate} onChange={(e) => setEdit({ ...edit, estimate: Number(e.target.value) })} />
                  <FieldError msg={errors.estimate} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveTask}>Save task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
