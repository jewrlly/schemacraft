import clsx from 'clsx'
import type { TableColor } from '../types'

/** Кольори заголовків таблиць. Класи записані повністю, щоб Tailwind їх знайшов. */
export const tableColorClasses: Record<TableColor, { header: string; dot: string; ring: string }> = {
    indigo: { header: 'bg-indigo-50 text-indigo-900 border-indigo-200', dot: 'bg-indigo-500', ring: 'ring-indigo-400' },
    emerald: { header: 'bg-emerald-50 text-emerald-900 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
    amber: { header: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500', ring: 'ring-amber-400' },
    rose: { header: 'bg-rose-50 text-rose-900 border-rose-200', dot: 'bg-rose-500', ring: 'ring-rose-400' },
    sky: { header: 'bg-sky-50 text-sky-900 border-sky-200', dot: 'bg-sky-500', ring: 'ring-sky-400' },
    violet: { header: 'bg-violet-50 text-violet-900 border-violet-200', dot: 'bg-violet-500', ring: 'ring-violet-400' },
}

/** Стиль поля вводу; якщо invalid — червона рамка. */
export const inputClass = (invalid?: boolean) =>
    clsx(
        'min-h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2',
        invalid ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
    )