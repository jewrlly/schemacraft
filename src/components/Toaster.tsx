import clsx from 'clsx'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToastStore } from '../store/toastStore'

/** Короткі сповіщення про результат дії. Не перекривають роботу і зникають самі. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={clsx(
            'pointer-events-auto flex w-full max-w-sm cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-3 text-left text-sm shadow-lg',
            t.kind === 'error' ? 'border-rose-200 text-rose-800' : 'border-slate-200 text-slate-800',
          )}
        >
          {t.kind === 'success' && <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />}
          {t.kind === 'error' && <XCircle size={18} className="shrink-0 text-rose-600" />}
          {t.kind === 'info' && <Info size={18} className="shrink-0 text-indigo-600" />}
          {t.text}
        </button>
      ))}
    </div>
  )
}