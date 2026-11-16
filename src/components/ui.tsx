import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
}

/** Кнопка застосунку в одному з чотирьох стилів. */
export function Button({
  variant = 'secondary',
  className,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

/** Невелика кольорова мітка, наприклад «2 помилки». */
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'red' | 'amber' | 'green' | 'indigo' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    red: 'bg-rose-100 text-rose-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
    indigo: 'bg-indigo-100 text-indigo-800',
  }
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

/** Що показати, коли даних ще немає: іконка, заголовок, пояснення і кнопки. */
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">{icon}</div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

/** Підпис над полем вводу і текст помилки під ним. */
export function Field({ label, error, children, htmlFor }: { label: string; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}