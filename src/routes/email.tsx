import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles as Wand, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, FieldError, PageHeader, Panel, errMsg } from "@/components/common";
import { generateEmail } from "@/lib/ai.functions";
import { setState, uid, useStore } from "@/lib/store";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — WorkPilot" },
      { name: "description", content: "Generate professional emails in any tone from key points, meetings or tasks." },
      { property: "og:title", content: "Smart Email Generator — WorkPilot" },
      { property: "og:description", content: "Generate professional emails in any tone from key points, meetings or tasks." },
    ],
  }),
  component: EmailPage,
});

const TONES = ["Professional", "Friendly", "Formal", "Persuasive", "Apologetic", "Concise"];
const PURPOSES = ["Follow-up", "Meeting recap", "Request", "Status update", "Introduction", "Thank you", "Reminder", "Decline"];

function EmailPage() {
  const ctx = useStore((s) => s.emailContext);
  const emails = useStore((s) => s.emails);
  const [form, setForm] = useState({ purpose: "Follow-up", tone: "Professional", recipient: "", keyPoints: "", context: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ id?: string; subject: string; body: string } | null>(null);

  useEffect(() => {
    if (ctx) {
      setForm((f) => ({ ...f, ...ctx }));
      setState(() => ({ emailContext: null }));
      toast.info("Details loaded — choose a tone and generate.");
    }
  }, [ctx]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function run() {
    const e: Record<string, string> = {};
    if (form.keyPoints.trim().length < 5) e.keyPoints = "Add a few key points (at least 5 characters).";
    if (form.recipient.length > 120) e.recipient = "Recipient name is too long.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const r = await generateEmail({ data: form });
      setDraft(r);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!draft) return;
    if (!draft.subject.trim() || !draft.body.trim()) return toast.error("Subject and body can't be empty.");
    const id = draft.id ?? uid();
    setState((s) => ({
      emails: [
        { id, subject: draft.subject, body: draft.body, tone: form.tone, purpose: form.purpose, recipient: form.recipient, createdAt: new Date().toISOString() },
        ...s.emails.filter((m) => m.id !== id),
      ],
    }));
    setDraft({ ...draft, id });
    toast.success("Email saved");
  }

  return (
    <>
      <PageHeader eyebrow="Smart Email Generator" title="Write it once, right." description="Describe what you need to say. Choose a tone and purpose — the assistant drafts a polished email you can edit." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={set("purpose")}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tone</Label>
                <Select value={form.tone} onValueChange={set("tone")}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="rcpt">Recipient</Label>
              <Input id="rcpt" className="mt-1.5" placeholder="e.g. Thandi Mokoena, Finance Lead" value={form.recipient} maxLength={120} onChange={(e) => set("recipient")(e.target.value)} />
              <FieldError msg={errors.recipient} />
            </div>
            <div>
              <Label htmlFor="kp">Key points *</Label>
              <Textarea id="kp" className="mt-1.5 min-h-32" maxLength={4000} placeholder="- Budget approved&#10;- Need sign-off by Friday" value={form.keyPoints} onChange={(e) => set("keyPoints")(e.target.value)} />
              <FieldError msg={errors.keyPoints} />
            </div>
            <div>
              <Label htmlFor="ctx">Context (optional)</Label>
              <Textarea id="ctx" className="mt-1.5 min-h-20" maxLength={6000} placeholder="Meeting outcomes or task details" value={form.context} onChange={(e) => set("context")(e.target.value)} />
            </div>
            <Button onClick={run} disabled={loading} size="lg">
              {loading ? <Loader2 className="animate-spin" /> : <Wand />} {loading ? "Drafting…" : draft ? "Regenerate" : "Generate email"}
            </Button>
          </div>
        </Panel>

        <Panel className="lg:col-span-3">
          {draft ? (
            <div className="grid gap-3">
              <Label htmlFor="subj">Subject</Label>
              <Input id="subj" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" className="min-h-80 leading-relaxed" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={save}><Save /> Save</Button>
                <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} />
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center text-center text-muted-foreground">
              <div>
                <div className="font-display text-2xl text-foreground">Your draft appears here</div>
                <p className="mt-2 text-sm">Fill in the key points and press Generate.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <h2 className="mb-3 mt-10 text-2xl">Saved emails</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {emails.map((m) => (
          <Panel key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{m.subject}</div>
                <div className="text-xs text-muted-foreground">{m.purpose} · {m.tone}{m.recipient ? ` · ${m.recipient}` : ""}</div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Delete email" onClick={() => setState((s) => ({ emails: s.emails.filter((x) => x.id !== m.id) }))}><Trash2 /></Button>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{m.body}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setDraft({ id: m.id, subject: m.subject, body: m.body }); setForm((f) => ({ ...f, tone: m.tone, purpose: m.purpose, recipient: m.recipient })); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
              <CopyButton text={`Subject: ${m.subject}\n\n${m.body}`} />
            </div>
          </Panel>
        ))}
        {!emails.length && <p className="text-sm text-muted-foreground">No saved emails yet.</p>}
      </div>
    </>
  );
}
