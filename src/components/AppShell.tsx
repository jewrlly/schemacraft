import { ChevronRight, Database } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ConfirmHost } from './ConfirmDialog'
import { Toaster } from './Toaster'

/** Один пункт навігаційного шляху вгорі сторінки: текст і (необов'язково) посилання. */
export interface Crumb {
  label: string
  to?: string
}

/** Каркас застосунку: шапка зверху, під нею — поточна сторінка. */
export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Database size={18} />
          </span>
          SchemaCraft
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <ConfirmHost />
      <Toaster />
    </div>
  )
}

/** Панель угорі сторінки: навігаційний шлях ліворуч і кнопки дій праворуч. */
export function PageBar({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <nav aria-label="Навігаційний шлях">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
              {c.to ? (
                <Link to={c.to} className="rounded px-1 text-slate-500 hover:text-indigo-700">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="px-1 font-semibold text-slate-900">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}