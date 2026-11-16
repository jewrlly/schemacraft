import { useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { useProject } from '../store/projectStore'

export function SqlPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  if (!project) return <NotFound what="Схему" />

  return (
    <>
      <PageBar crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name, to: `/project/${project.id}` }, { label: 'SQL-скрипт' }]} />
      <p className="p-6 text-sm text-slate-500">Тут буде згенерований SQL.</p>
    </>
  )
}