import { Link } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { useProjectStore } from '../store/projectStore'

export function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects)
  const createProject = useProjectStore((s) => s.createProject)

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми' }]}
        actions={
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white" onClick={() => createProject('Нова схема')}>
            Нова схема
          </button>
        }
      />
      <ul className="flex flex-col gap-2 p-6">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/project/${p.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300">
              {p.name} — таблиць: {p.tables.length}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}