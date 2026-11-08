'use client';

import type { PublicationStatus } from '@portfolio/contracts';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/* ── Buttons ── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'border-fg bg-fg text-bg hover:opacity-85',
  secondary: 'border-line-strong bg-surface text-fg hover:border-fg',
  ghost: 'border-transparent text-muted hover:text-fg hover:bg-raised',
  danger: 'border-danger text-danger hover:bg-danger hover:text-on-accent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; size?: 'sm' | 'md' }>(
  function Button({ variant = 'secondary', busy, size = 'md', className = '', children, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 border font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'} ${VARIANTS[variant]} ${className}`}
        {...props}
      >
        {busy && <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
    );
  },
);

/* ── Form fields ── */

const control =
  'w-full border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-faint transition-colors hover:border-line-strong focus:border-cool focus:outline-none aria-[invalid=true]:border-danger disabled:opacity-60';

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className = '',
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: boolean) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : hint ? { 'aria-describedby': `${id}-hint` } : {};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${control} h-10 ${className}`} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`${control} min-h-24 resize-y leading-relaxed ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', children, ...props }, ref) {
  return <select ref={ref} className={`${control} h-10 ${className}`} {...props}>{children}</select>;
});

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }>(
  function Checkbox({ label, hint, id, ...props }, ref) {
    return (
      <div className="flex items-start gap-3">
        <input ref={ref} id={id} type="checkbox" className="mt-0.5 size-4 cursor-pointer accent-[var(--cool)]" {...props} />
        <label htmlFor={id} className="flex cursor-pointer flex-col text-sm">
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </label>
      </div>
    );
  },
);

/* ── Status ── */

const STATUS: Record<PublicationStatus, { label: string; className: string; symbol: string }> = {
  draft: { label: 'Draft', className: 'text-muted border-line-strong', symbol: '○' },
  published: { label: 'Published', className: 'text-ok border-ok', symbol: '●' },
  changed: { label: 'Unpublished changes', className: 'text-warn border-warn', symbol: '◐' },
};

export function StatusPill({ status }: { status: PublicationStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-2xs ${s.className}`}>
      <span aria-hidden>{s.symbol}</span>
      {s.label}
    </span>
  );
}

/* ── Layout helpers ── */

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, children, actions }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border border-line bg-surface p-5 md:p-6">
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

/* ── Confirmation dialog (native <dialog>: focus trap and Escape for free) ── */

export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  variant = 'danger',
  size,
  disabled,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} onClick={() => ref.current?.showModal()}>
        {children}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] border border-line bg-surface p-0 text-fg backdrop:bg-scrim"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="confirm-title" className="text-xl font-bold">{title}</h2>
          <div className="text-sm text-muted">{description}</div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => ref.current?.close()} autoFocus>Cancel</Button>
            <Button
              variant="danger"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  ref.current?.close();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/* ── Toasts ── */

type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <p
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto border bg-surface px-4 py-3 text-sm shadow-lg shadow-black/10 ${t.tone === 'error' ? 'border-danger text-danger' : 'border-ok'}`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Warns before leaving a page with unsaved changes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
