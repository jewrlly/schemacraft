import { useMemo, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Copy, Download } from 'lucide-react'
import { countBySeverity, validateProject } from '../lib/validator'
import { Link, useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { Button } from '../components/ui'
import { copyText, downloadFile, safeFileName } from '../lib/download'
import { generateSql } from '../lib/sqlGenerator'
import { useProject } from '../store/projectStore'
import { toast } from '../store/toastStore'

const KEYWORDS =
  /\b(CREATE|TABLE|ALTER|ADD|CONSTRAINT|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|NOT|NULL|DEFAULT|ON|DELETE|CASCADE|SET|RESTRICT|INDEX|TRUE|FALSE|CURRENT_TIMESTAMP|CURRENT_DATE)\b/g

/** Просте підсвічування синтаксису: текст розбивається на частини, без вставки HTML (захист від XSS). */
function highlightLine(line: string): ReactNode {
  if (line.startsWith('--')) return <span className="text-slate-500 italic">{line}</span>
  const parts: ReactNode[] = []
  const re = new RegExp(`${KEYWORDS.source}|"(?:[^"]|"")*"|'(?:[^']|'')*'`, 'g')
  let last = 0
  for (const m of line.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) parts.push(line.slice(last, i))
    const token = m[0]
    const cls = token.startsWith('"') ? 'text-sky-800' : token.startsWith("'") ? 'text-emerald-700' : 'font-semibold text-indigo-700'
    parts.push(
      <span key={i} className={cls}>
        {token}
      </span>,
    )
    last = i + token.length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts
}

export function SqlPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const sql = useMemo(() => (project ? generateSql(project) : ''), [project])
  const counts = useMemo(() => countBySeverity(project ? validateProject(project) : []), [project])

  if (!project) return <NotFound what="Схему" />

  const lines = sql.replace(/\n$/, '').split('\n')

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name, to: `/project/${project.id}` }, { label: 'SQL-скрипт' }]}
        actions={
          <>
            <Button
              icon={<Copy size={16} />}
              onClick={async () => {
                const ok = await copyText(sql)
                toast(ok ? 'SQL скопійовано в буфер обміну' : 'Не вдалося скопіювати', ok ? 'success' : 'error')
              }}
            >
              Копіювати
            </Button>
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={() => {
                downloadFile(`${safeFileName(project.name)}.sql`, sql, 'application/sql')
                toast('Файл .sql завантажено')
              }}
            >
              Завантажити .sql
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
          {counts.error > 0 && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="flex-1">Схема має помилки ({counts.error}), тому скрипт може не виконатися в базі даних.</span>
              <Link to={`/project/${project.id}/validation`} className="font-semibold underline underline-offset-2">
                Переглянути помилки
              </Link>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs text-slate-600">
              <span>PostgreSQL · {lines.length} рядків</span>
              <Link to={`/project/${project.id}`} className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
                <ArrowLeft size={14} /> До діаграми
              </Link>
            </div>
            <pre className="overflow-x-auto bg-slate-50 py-3 text-[13px] leading-6" aria-label="Згенерований SQL-код" tabIndex={0}>
              <code className="font-mono">
                {lines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-12 shrink-0 pr-4 text-right text-slate-400 select-none" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="pr-4 whitespace-pre text-slate-800">{highlightLine(line)}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}