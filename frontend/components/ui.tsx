import { PropsWithChildren, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-teal-800",
  secondary: "bg-slate-900 text-white shadow-sm shadow-slate-900/15 hover:bg-slate-700",
  ghost: "bg-white/70 text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:text-slate-950",
  danger: "bg-red-600 text-white shadow-sm shadow-red-600/15 hover:bg-red-700",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>) {
  return (
    <button className={`${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={`rounded-[1.5rem] border border-white/70 bg-white/82 p-4 shadow-[0_24px_70px_rgb(15_23_42/0.08)] backdrop-blur md:rounded-[2rem] md:p-6 ${className}`}>
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
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.26em] text-brand">{eyebrow}</div> : null}
        <h1 className="mt-2 text-[clamp(2rem,9vw,3.25rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 md:w-auto">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
      {active ? "啟用" : "停用"}
    </span>
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
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 flex h-[92dvh] w-full flex-col rounded-t-[2rem] bg-[#fbfcf8] shadow-[-24px_0_80px_rgb(15_23_42/0.18)] md:top-0 md:h-full md:max-w-xl md:rounded-none">
        <div className="border-b border-slate-200 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{title}</h2>
              {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
            </div>
            <Button className="w-full sm:w-auto" variant="ghost" onClick={onClose} type="button">
              關閉
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">{children}</div>
        {footer ? <div className="border-t border-slate-200 bg-white/70 px-4 py-4 md:px-6">{footer}</div> : null}
      </aside>
    </div>
  );
}
