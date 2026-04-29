import { PropsWithChildren, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/15 hover:bg-teal-700 active:scale-[0.99]",
  secondary: "bg-slate-800 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-700 active:scale-[0.99]",
  ghost: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.99]",
  danger: "bg-red-600 text-white shadow-sm shadow-red-600/10 hover:bg-red-700 active:scale-[0.99]",
  quiet: "bg-teal-50 text-teal-800 hover:bg-teal-100 active:scale-[0.99]",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>) {
  return (
    <button className={`${buttonVariants[variant]} inline-flex items-center justify-center gap-2 ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={`rounded-[1.2rem] border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4 md:rounded-[1.65rem] md:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-teal-100 bg-gradient-to-br from-white to-teal-50/70 px-5 py-6 shadow-sm md:rounded-[1.9rem] md:px-7 md:py-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{eyebrow}</div> : null}
          <h1 className="mt-3 text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-[1] tracking-[-0.045em] text-slate-950 md:max-w-3xl">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
        </div>
        {action ? <div className="w-full shrink-0 md:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  helper,
  tone = "light",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: "light" | "dark" | "brand" | "warm";
}) {
  const tones = {
    light: "bg-white text-slate-950 ring-slate-200",
    dark: "bg-slate-800 text-white ring-slate-800",
    brand: "bg-teal-50 text-teal-950 ring-teal-100",
    warm: "bg-amber-50 text-slate-950 ring-amber-100",
  };

  return (
    <div className={`rounded-[1.1rem] p-3.5 shadow-sm ring-1 sm:p-4 md:rounded-[1.25rem] md:p-5 ${tones[tone]}`}>
      <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${tone === "dark" ? "text-white/70" : "text-slate-500"}`}>{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{value}</div>
      {helper ? <div className={`mt-1.5 text-xs leading-5 sm:text-sm ${tone === "dark" ? "text-white/70" : "text-slate-500"}`}>{helper}</div> : null}
    </div>
  );
}

export function StatGrid({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`grid grid-cols-2 gap-3 md:gap-4 ${className}`}>{children}</section>;
}

export function CompactInfoGrid({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`grid grid-cols-2 gap-2 text-sm ${className}`}>{children}</div>;
}

export function CompactInfo({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-100">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className={`mt-1 truncate ${strong ? "font-semibold text-teal-700" : "font-semibold text-slate-700"}`}>{value}</div>
    </div>
  );
}

export function StatusPill({ active, children }: PropsWithChildren<{ active: boolean }>) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
      {children ?? (active ? "啟用" : "停用")}
    </span>
  );
}

export function Alert({ children, tone = "error" }: PropsWithChildren<{ tone?: "error" | "success" | "info" }>) {
  const tones = {
    error: "bg-red-50 text-red-700 ring-red-100",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    info: "bg-sky-50 text-sky-700 ring-sky-100",
  };
  return <div className={`rounded-2xl px-4 py-3 text-sm font-medium ring-1 ${tones[tone]}`}>{children}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
      <div className="text-base font-semibold text-slate-800">{title}</div>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export function SlideOver({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
}>) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-teal-900/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 flex h-[92dvh] w-full flex-col rounded-t-[2rem] bg-[#fbfcf8] shadow-[0_-18px_50px_rgb(15_23_42/0.12)] md:top-0 md:h-full md:max-w-xl md:rounded-l-[2rem] md:rounded-t-none">
        <div className="border-b border-slate-200 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h2>
              {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
            </div>
            <Button className="w-full sm:w-auto" variant="ghost" onClick={onClose} type="button">
              關閉
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">{children}</div>
        {footer ? <div className="mobile-safe-bottom border-t border-slate-200 bg-white/90 px-4 py-4 md:px-6">{footer}</div> : null}
      </aside>
    </div>
  );
}
