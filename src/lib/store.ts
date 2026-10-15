import { useSyncExternalStore } from "react";

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "done";

export type Email = {
  id: string;
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  recipient: string;
  createdAt: string;
};
export type Meeting = {
  id: string;
  title: string;
  date: string;
  notes: string;
  summary: string;
  decisions: string[];
  actionItems: { task: string; owner: string; due: string; priority: Priority }[];
  createdAt: string;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  due: string;
  status: Status;
  estimate: number;
  scheduledFor?: string;
  reason?: string;
  source?: string;
};
export type EmailDraftContext = { purpose: string; recipient: string; keyPoints: string; context: string };

type State = {
  emails: Email[];
  meetings: Meeting[];
  tasks: Task[];
  emailContext: EmailDraftContext | null;
};

const KEY = "workpilot-state-v1";
const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const uid = () => Math.random().toString(36).slice(2, 10);

const seed = (): State => ({
  emailContext: null,
  emails: [
    {
      id: uid(),
      subject: "Q4 Budget Review – Updated Figures Attached",
      body: "Hi Thandi,\n\nThank you for your patience while we finalised the Q4 numbers. I've attached the updated budget, which reflects the 8% reduction in vendor costs we discussed.\n\nCould you review it by Friday so we can submit to finance on Monday?\n\nKind regards,\n[Your Name]",
      tone: "Professional",
      purpose: "Follow-up",
      recipient: "Thandi Mokoena",
      createdAt: new Date(Date.now() - 864e5).toISOString(),
    },
  ],
  meetings: [
    {
      id: uid(),
      title: "Product Launch Sync – Atlas v2",
      date: day(-2),
      notes:
        "Attendees: Sipho (PM), Lerato (Design), James (Eng), Priya (Marketing).\nLaunch date confirmed for the 14th of next month. James flagged the payment API migration is 3 days behind; team agreed to cut the dark-mode feature from v2 scope. Lerato to deliver final onboarding screens by Friday. Priya will draft the press release and share with Sipho by next Wednesday. Sipho to update the stakeholder roadmap deck before the board meeting. Budget for launch ads approved at R120,000.",
      summary:
        "The team confirmed the Atlas v2 launch for the 14th of next month. To protect the timeline, dark mode was cut from v2 scope after engineering reported the payment API migration is three days behind. Design, marketing and product each own deliverables leading up to launch, and the ad budget was approved.",
      decisions: ["Launch date set for the 14th of next month", "Dark mode removed from v2 scope", "Launch ad budget approved at R120,000"],
      actionItems: [
        { task: "Deliver final onboarding screens", owner: "Lerato", due: day(2), priority: "high" },
        { task: "Draft press release and share with Sipho", owner: "Priya", due: day(6), priority: "medium" },
        { task: "Update stakeholder roadmap deck", owner: "Sipho", due: day(4), priority: "high" },
      ],
      createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    },
  ],
  tasks: [
    { id: uid(), title: "Prepare board meeting slides", description: "Q3 results and Q4 outlook", priority: "high", due: day(3), status: "in_progress", estimate: 4 },
    { id: uid(), title: "Review vendor contracts", description: "Renewals for cloud hosting and CRM", priority: "medium", due: day(7), status: "todo", estimate: 2 },
    { id: uid(), title: "1:1 feedback notes for team", description: "Quarterly check-ins", priority: "low", due: day(10), status: "todo", estimate: 1.5 },
    { id: uid(), title: "Submit expense report", description: "September travel", priority: "medium", due: day(1), status: "todo", estimate: 0.5 },
    { id: uid(), title: "Onboard new analyst", description: "Accounts, docs, intro meetings", priority: "high", due: day(-1), status: "done", estimate: 3 },
  ],
});

let state: State | null = null;
const listeners = new Set<() => void>();
const serverState = seed();

function get(): State {
  if (typeof window === "undefined") return serverState;
  if (!state) {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? (JSON.parse(raw) as State) : seed();
    } catch {
      state = seed();
    }
  }
  return state;
}

export function setState(fn: (s: State) => Partial<State>) {
  state = { ...get(), ...fn(get()) };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => sel(get()),
    () => sel(serverState),
  );
}

export const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
