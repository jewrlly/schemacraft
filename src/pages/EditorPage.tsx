import { Link, useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { useProject, useProjectStore } from '../store/projectStore'

export function EditorPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const addTable = useProjectStore((s) => s.addTable)

  if (!project) return <NotFound what="Схему" />

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name }]}
        actions={
          <>
            <Link to={`/project/${project.id}/validation`} className="rounded-lg border px-3 py-2 text-sm">Перевірка</Link>
            <Link to={`/project/${project.id}/sql`} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">SQL</Link>
          </>
        }
      />
      <div className="flex flex-col gap-3 p-6">
        <button className="w-fit rounded-lg border px-3 py-2 text-sm" onClick={() => addTable(project.id)}>
          + Таблиця
        </button>
        <p className="text-sm text-slate-500">Тут буде діаграма. Поки що — список таблиць:</p>
        <ul className="flex flex-col gap-2">
          {project.tables.map((t) => (
            <li key={t.id}>
              <Link to={`/project/${project.id}/table/${t.id}`} className="text-indigo-700 underline">{t.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}