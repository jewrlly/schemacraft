import { useMemo } from 'react'
import clsx from 'clsx'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, MapPin, Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { countBySeverity, validateProject, type Severity } from '../lib/validator'
import { useProject } from '../store/projectStore'

/** Як показувати кожен рівень: назва, іконка, кольори. */
const severityMeta: Record<Severity, { label: string; icon: typeof Info; card: string; iconCls: string }> = {
  error: { label: 'Помилки', icon: AlertCircle, card: 'border-rose-200 bg-rose-50', iconCls: 'text-rose-600' },
  warning: { label: 'Попередження', icon: AlertTriangle, card: 'border-amber-200 bg-amber-50', iconCls: 'text-amber-600' },
  info: { label: 'Поради', icon: Info, card: 'border-sky-200 bg-sky-50', iconCls: 'text-sky-600' },
}

const SEVERITIES: Severity[] = ['error', 'warning', 'info']

export function ValidationPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const issues = useMemo(() => (project ? validateProject(project) : []), [project])
  const counts = countBySeverity(issues)

  if (!project) return <NotFound what="Схему" />

  const linkCls =
    'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50'

  return (
    <>
      <PageBar crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name, to: `/project/${project.id}` }, { label: 'Перевірка схеми' }]} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6">
          {/* Три картки-лічильники */}
          <div className="grid grid-cols-3 gap-3">
            {SEVERITIES.map((s) => {
              const Icon = severityMeta[s].icon
              return (
                <div key={s} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
                    <Icon size={16} className={severityMeta[s].iconCls} />
                    <span className="truncate">{severityMeta[s].label}</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[s]}</p>
                </div>
              )
            })}
          </div>

          {/* Усе добре */}
          {counts.error === 0 && counts.warning === 0 && project.tables.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">Помилок не знайдено</p>
                <p className="text-sm">
                  Схема готова.{' '}
                  <Link to={`/project/${project.id}/sql`} className="font-medium underline underline-offset-2">
                    Отримати SQL-скрипт
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Списки проблем за рівнями */}
          {SEVERITIES.map((s) => {
            const list = issues.filter((i) => i.severity === s)
            if (list.length === 0) return null
            const Icon = severityMeta[s].icon
            return (
              <section key={s} aria-labelledby={`sev-${s}`}>
                <h2 id={`sev-${s}`} className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  {severityMeta[s].label} ({list.length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {list.map((issue) => (
                    <li key={issue.id} className={clsx('flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start', severityMeta[s].card)}>
                      <Icon size={18} className={clsx('shrink-0', severityMeta[s].iconCls)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium break-words text-slate-900">{issue.message}</p>
                        <p className="mt-0.5 text-sm text-slate-700">{issue.hint}</p>
                      </div>
                      {issue.tableId && (
                        <div className="flex shrink-0 gap-2">
                          <Link to={`/project/${project.id}?focus=${issue.tableId}`} className={linkCls}>
                            <MapPin size={14} /> На діаграмі
                          </Link>
                          <Link to={`/project/${project.id}/table/${issue.tableId}`} className={linkCls}>
                            <Pencil size={14} /> Виправити
                          </Link>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}