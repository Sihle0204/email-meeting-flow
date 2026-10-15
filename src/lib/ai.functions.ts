import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailInput = z.object({
  purpose: z.string().trim().min(1).max(100),
  tone: z.string().trim().min(1).max(50),
  recipient: z.string().trim().max(120).default(""),
  keyPoints: z.string().trim().min(5).max(4000),
  context: z.string().trim().max(6000).default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }) => {
    const { askJson } = await import("./ai.server");
    const r = await askJson<{ subject: string; body: string }>(
      `You are an expert business communications writer. Write clear, concise, professional workplace emails.
Rules: match the requested tone exactly; open with an appropriate greeting using the recipient's name if given; use short paragraphs; include a clear call to action when relevant; close with a sign-off and the placeholder "[Your Name]". Never invent facts beyond the key points and context.
Output JSON shape: {"subject": string, "body": string}`,
      `Purpose: ${data.purpose}\nTone: ${data.tone}\nRecipient: ${data.recipient || "(not specified)"}\nKey points:\n${data.keyPoints}\n${data.context ? `\nAdditional context (meeting outcomes or task details):\n${data.context}` : ""}`,
    );
    return { subject: String(r.subject ?? ""), body: String(r.body ?? "") };
  });

const meetingInput = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().min(30, "Notes are too short to summarize").max(20000),
});

export type ActionItem = { task: string; owner: string; due: string; priority: "high" | "medium" | "low" };

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => meetingInput.parse(d))
  .handler(async ({ data }) => {
    const { askJson } = await import("./ai.server");
    const today = new Date().toISOString().slice(0, 10);
    const r = await askJson<{ summary: string; decisions: string[]; actionItems: ActionItem[] }>(
      `You are a meticulous executive assistant who summarizes meeting notes.
Produce: (1) a 3-5 sentence summary, (2) a list of concrete decisions made, (3) action items with owner (or "Unassigned"), due date as YYYY-MM-DD (infer from relative phrases using today's date ${today}; if none, empty string) and priority high/medium/low based on urgency and impact.
Only use information present in the notes.
Output JSON shape: {"summary": string, "decisions": string[], "actionItems": [{"task": string, "owner": string, "due": string, "priority": "high"|"medium"|"low"}]}`,
      `Meeting: ${data.title}\n\nNotes:\n${data.notes}`,
    );
    const pr = (p: string) => (["high", "medium", "low"].includes(p) ? p : "medium") as ActionItem["priority"];
    return {
      summary: String(r.summary ?? ""),
      decisions: (r.decisions ?? []).map(String),
      actionItems: (r.actionItems ?? []).map((a) => ({
        task: String(a.task ?? ""),
        owner: String(a.owner ?? "Unassigned"),
        due: /^\d{4}-\d{2}-\d{2}$/.test(a.due ?? "") ? a.due : "",
        priority: pr(a.priority),
      })),
    };
  });

const planInput = z.object({
  hoursPerDay: z.number().min(1).max(16),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(300),
        due: z.string().max(20),
        priority: z.string().max(10),
        estimate: z.number().min(0).max(100),
      }),
    )
    .min(1, "Add at least one open task")
    .max(60),
});

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planInput.parse(d))
  .handler(async ({ data }) => {
    const { askJson } = await import("./ai.server");
    const today = new Date().toISOString().slice(0, 10);
    const r = await askJson<{
      plan: { id: string; priority: "high" | "medium" | "low"; scheduledFor: string; reason: string }[];
      advice: string;
    }>(
      `You are a productivity coach who prioritizes and schedules work using deadlines, importance and effort (Eisenhower method).
Today is ${today}. The user has ${data.hoursPerDay} focus hours per weekday. Schedule every task on a weekday on or after today and before its due date where possible, without exceeding daily hours. Re-assess priority. Give a one-sentence reason per task and 2-3 sentences of overall advice.
Output JSON shape: {"plan": [{"id": string, "priority": "high"|"medium"|"low", "scheduledFor": "YYYY-MM-DD", "reason": string}], "advice": string}`,
      JSON.stringify(data.tasks),
    );
    return { plan: r.plan ?? [], advice: String(r.advice ?? "") };
  });
