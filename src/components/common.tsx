import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/store";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
        <h1 className="mt-2 text-3xl md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border bg-card p-5 shadow-card md:p-6", className)}>{children}</section>;
}

export function PriorityBadge({ p }: { p: Priority }) {
  const styles = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/20 text-accent-foreground",
    low: "bg-success/15 text-primary",
  }[p];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", styles)}>{p}</span>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }}
    >
      <Copy /> {label}
    </Button>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null;
}

export function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(m);
    if (Array.isArray(parsed)) return parsed[0]?.message ?? "Invalid input";
  } catch {}
  return m;
}
