import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ListPlus, Loader2, Mail, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, FieldError, PageHeader, Panel, PriorityBadge, errMsg } from "@/components/common";
import { summarizeMeeting } from "@/lib/ai.functions";
import { setState, uid, useStore, type Meeting, type Priority } from "@/lib/store";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — WorkPilot" },
      { name: "description", content: "Summarize meeting notes, extract decisions and send action items to your task planner." },
      { property: "og:title", content: "Meeting Notes Summarizer — WorkPilot" },
      { property: "og:description", content: "Summarize meeting notes, extract decisions and send action items to your task planner." },
    ],
  }),
  component: MeetingsPage,
});

type Draft = Omit<Meeting, "createdAt">;
const empty = (): Draft => ({ id: uid(), title: "", date: new Date().toISOString().slice(0, 10), notes: "", summary: "", decisions: [], actionItems: [] });

function MeetingsPage() {
  const meetings = useStore((s) => s.meetings);
  const navigate = useNavigate();
  const [m, setM] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const hasResult = !!m.summary;

  async function run() {
    const e: Record<string, string> = {};
    if (!m.title.trim()) e.title = "Give the meeting a title.";
    if (m.notes.trim().length < 30) e.notes = "Paste at least a few sentences of notes (30+ characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const r = await summarizeMeeting({ data: { title: m.title, notes: m.notes } });
      setM({ ...m, ...r });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  function save() {
    setState((s) => ({ meetings: [{ ...m, createdAt: new Date().toISOString() }, ...s.meetings.filter((x) => x.id !== m.id)] }));
    toast.success("Meeting saved");
  }

  function sendToPlanner(src: Draft) {
    const items = src.actionItems.filter((a) => a.task.trim());
    if (!items.length) return toast.error("No action items to send.");
    setState((s) => ({
      tasks: [
        ...items.map((a) => ({
          id: uid(),
          title: a.task,
          description: `Owner: ${a.owner} · From "${src.title}"`,
          priority: a.priority,
          due: a.due,
          status: "todo" as const,
          estimate: 1,
          source: src.title,
        })),
        ...s.tasks,
      ],
    }));
    toast.success(`${items.length} tasks added to planner`, { action: { label: "Open", onClick: () => navigate({ to: "/tasks" }) } });
  }

  function draftEmail(src: Draft) {
    setState(() => ({
      emailContext: {
        purpose: "Meeting recap",
        recipient: "Meeting attendees",
        keyPoints: `Recap of "${src.title}" (${src.date}). Share decisions and action items with owners and due dates.`,
        context: `Summary: ${src.summary}\nDecisions:\n${src.decisions.map((d) => `- ${d}`).join("\n")}\nAction items:\n${src.actionItems.map((a) => `- ${a.task} (${a.owner}${a.due ? `, due ${a.due}` : ""})`).join("\n")}`,
      },
    }));
    navigate({ to: "/email" });
  }

  const updItem = (i: number, patch: Partial<Draft["actionItems"][number]>) =>
    setM({ ...m, actionItems: m.actionItems.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const plain = `${m.title}\n\nSummary:\n${m.summary}\n\nDecisions:\n${m.decisions.map((d) => `- ${d}`).join("\n")}\n\nAction items:\n${m.actionItems.map((a) => `- ${a.task} — ${a.owner}${a.due ? ` (due ${a.due})` : ""}`).join("\n")}`;

  return (
    <>
      <PageHeader
        eyebrow="Meeting Notes Summarizer"
        title="From messy notes to clear next steps."
        description="Paste raw notes. Get a summary, key decisions and action items you can send straight to your planner."
        actions={<Button variant="outline" onClick={() => { setM(empty()); setErrors({}); }}><Plus /> New meeting</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="t">Meeting title *</Label>
                <Input id="t" className="mt-1.5" maxLength={200} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} placeholder="Weekly sales sync" />
                <FieldError msg={errors.title} />
              </div>
              <div>
                <Label htmlFor="d">Date</Label>
                <Input id="d" type="date" className="mt-1.5" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="n">Notes *</Label>
              <Textarea id="n" className="mt-1.5 min-h-72" maxLength={20000} value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} placeholder="Who attended, what was discussed, what was agreed, who owns what…" />
              <FieldError msg={errors.notes} />
            </div>
            <Button size="lg" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />} {loading ? "Summarizing…" : hasResult ? "Re-summarize" : "Summarize notes"}
            </Button>
          </div>
        </Panel>

        <Panel>
          {hasResult ? (
            <div className="grid gap-5">
              <div>
                <Label>Summary</Label>
                <Textarea className="mt-1.5 min-h-28" value={m.summary} onChange={(e) => setM({ ...m, summary: e.target.value })} />
              </div>
              <div>
                <Label>Key decisions</Label>
                <ul className="mt-1.5 grid gap-2">
                  {m.decisions.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <Input value={d} onChange={(e) => setM({ ...m, decisions: m.decisions.map((x, j) => (j === i ? e.target.value : x)) })} />
                      <Button variant="ghost" size="icon" aria-label="Remove decision" onClick={() => setM({ ...m, decisions: m.decisions.filter((_, j) => j !== i) })}><X /></Button>
                    </li>
                  ))}
                </ul>
                <Button variant="link" size="sm" className="px-0" onClick={() => setM({ ...m, decisions: [...m.decisions, ""] })}><Plus /> Add decision</Button>
              </div>
              <div>
                <Label>Action items</Label>
                <ul className="mt-1.5 grid gap-3">
                  {m.actionItems.map((a, i) => (
                    <li key={i} className="grid gap-2 rounded-lg bg-muted p-3">
                      <div className="flex gap-2">
                        <Input value={a.task} onChange={(e) => updItem(i, { task: e.target.value })} />
                        <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => setM({ ...m, actionItems: m.actionItems.filter((_, j) => j !== i) })}><X /></Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={a.owner} onChange={(e) => updItem(i, { owner: e.target.value })} placeholder="Owner" />
                        <Input type="date" value={a.due} onChange={(e) => updItem(i, { due: e.target.value })} />
                        <select className="rounded-md border bg-card px-2 text-sm" value={a.priority} onChange={(e) => updItem(i, { priority: e.target.value as Priority })}>
                          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="link" size="sm" className="px-0" onClick={() => setM({ ...m, actionItems: [...m.actionItems, { task: "", owner: "Unassigned", due: "", priority: "medium" }] })}><Plus /> Add action item</Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button onClick={save}><Save /> Save</Button>
                <Button variant="secondary" onClick={() => sendToPlanner(m)}><ListPlus /> Send to planner</Button>
                <Button variant="secondary" onClick={() => draftEmail(m)}><Mail /> Draft follow-up</Button>
                <CopyButton text={plain} />
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center text-center text-muted-foreground">
              <div>
                <div className="font-display text-2xl text-foreground">Summary, decisions & actions</div>
                <p className="mt-2 text-sm">They'll appear here, fully editable.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <h2 className="mb-3 mt-10 text-2xl">Saved meetings</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {meetings.map((x) => (
          <Panel key={x.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{x.title}</div>
                <div className="text-xs text-muted-foreground">{x.date} · {x.decisions.length} decisions · {x.actionItems.length} actions</div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Delete meeting" onClick={() => setState((s) => ({ meetings: s.meetings.filter((y) => y.id !== x.id) }))}><Trash2 /></Button>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{x.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">{x.actionItems.slice(0, 3).map((a, i) => <PriorityBadge key={i} p={a.priority} />)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setM(x); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Open</Button>
              <Button size="sm" variant="outline" onClick={() => sendToPlanner(x)}><ListPlus /> To planner</Button>
              <Button size="sm" variant="outline" onClick={() => draftEmail(x)}><Mail /> Email</Button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
