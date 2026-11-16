import { useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { useProject } from '../store/projectStore'

export function TableEditorPage() {
  const { projectId, tableId } = useParams()
  const project = useProject(projectId)
  const table = project?.tables.find((t) => t.id === tableId)

  if (!project) return <NotFound what="Схему" />
  if (!table) return <NotFound what="Таблицю" />

  return (
    <>
      <PageBar crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name, to: `/project/${project.id}` }, { label: table.name }]} />
      <p className="p-6 text-sm text-slate-500">Тут буде редагування колонок таблиці «{table.name}».</p>
    </>
  )
}