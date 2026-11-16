import { useMemo, useState } from 'react'
import { FolderOpen, Link2, Pencil, Plus, Sparkles, Table2, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { Modal } from '../components/Modal'
import { inputClass } from '../components/styles'
import { Button, EmptyState, Field } from '../components/ui'
import { confirmAction } from '../store/confirmStore'
import { useProjectStore } from '../store/projectStore'
import { toast } from '../store/toastStore'
import type { Project } from '../types'

const MAX_PROJECT_NAME = 100

/** Перевіряє назву схеми. Повертає текст помилки або null, якщо все гаразд. */
function validateProjectName(name: string): string | null {
  const t = name.trim()
  if (!t) return 'Введіть назву схеми'
  if (t.length > MAX_PROJECT_NAME) return `Не довше ${MAX_PROJECT_NAME} символів`
  return null
}

/** Картка однієї схеми у списку. */
function ProjectCard({ project, onRename }: { project: Project; onRename: () => void }) {
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const updated = new Date(project.updatedAt).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })

  const onDelete = async () => {
    const ok = await confirmAction({
      title: 'Видалити схему?',
      text: `Схему «${project.name}» буде видалено разом з усіма таблицями. Цю дію не можна скасувати.`,
    })
    if (ok) {
      deleteProject(project.id)
      toast('Схему видалено')
    }
  }

  return (
    <li className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <Link to={`/project/${project.id}`} className="flex flex-1 flex-col gap-3 rounded-t-2xl p-5">
        <h2 className="line-clamp-2 font-semibold break-words text-slate-900 group-hover:text-indigo-700">{project.name}</h2>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Table2 size={15} /> {project.tables.length} табл.
          </span>
          <span className="inline-flex items-center gap-1">
            <Link2 size={15} /> {project.relations.length} зв'яз.
          </span>
        </div>
        <p className="mt-auto text-xs text-slate-500">Змінено: {updated}</p>
      </Link>
      <div className="flex border-t border-slate-100 p-1.5">
        <Button variant="ghost" className="flex-1" icon={<Pencil size={15} />} onClick={onRename} aria-label={`Перейменувати ${project.name}`}>
          <span className="hidden sm:inline">Назва</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 hover:!bg-rose-50 hover:!text-rose-700"
          icon={<Trash2 size={15} />}
          onClick={() => void onDelete()}
          aria-label={`Видалити ${project.name}`}
        >
          <span className="hidden sm:inline">Видалити</span>
        </Button>
      </div>
    </li>
  )
}

/** Яке вікно зараз відкрите: створення, перейменування або жодного. */
type NameDialog = { mode: 'create' } | { mode: 'rename'; project: Project } | null

export function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects)
  const createProject = useProjectStore((s) => s.createProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const navigate = useNavigate()

  const [dialog, setDialog] = useState<NameDialog>(null)
  const [name, setName] = useState('')
  const [withTemplate, setWithTemplate] = useState(false)
  const [touched, setTouched] = useState(false)
  const nameError = validateProjectName(name)

  // Спершу схеми, які змінювали останніми.
  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects])

  const openCreate = (template = false) => {
    setName(template ? 'Інтернет-магазин' : '')
    setWithTemplate(template)
    setTouched(false)
    setDialog({ mode: 'create' })
  }

  const openRename = (project: Project) => {
    setName(project.name)
    setTouched(false)
    setDialog({ mode: 'rename', project })
  }

  const submit = () => {
    setTouched(true)
    if (nameError || !dialog) return
    if (dialog.mode === 'create') {
      const id = createProject(name.trim(), withTemplate)
      setDialog(null)
      navigate(`/project/${id}`)
    } else {
      renameProject(dialog.project.id, name.trim())
      setDialog(null)
      toast('Назву змінено')
    }
  }

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми' }]}
        actions={
          projects.length > 0 && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openCreate()}>
              Нова схема
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={28} />}
            title="Тут поки немає жодної схеми"
            text="Створіть схему бази даних з нуля або відкрийте готовий приклад, щоб побачити, як працює редактор."
            action={
              <>
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => openCreate()}>
                  Створити схему
                </Button>
                <Button icon={<Sparkles size={16} />} onClick={() => openCreate(true)}>
                  Відкрити приклад
                </Button>
              </>
            }
          />
        ) : (
          <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {sorted.map((p) => (
              <ProjectCard key={p.id} project={p} onRename={() => openRename(p)} />
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={dialog !== null}
        title={dialog?.mode === 'rename' ? 'Перейменувати схему' : 'Нова схема'}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Скасувати</Button>
            <Button variant="primary" type="submit" form="project-form">
              {dialog?.mode === 'rename' ? 'Зберегти' : 'Створити'}
            </Button>
          </>
        }
      >
        <form
          id="project-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label="Назва схеми" htmlFor="project-name" error={touched ? nameError : null}>
            <input
              id="project-name"
              autoFocus
              className={inputClass(touched && !!nameError)}
              value={name}
              maxLength={MAX_PROJECT_NAME}
              placeholder="Наприклад: Бібліотека"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>

          {dialog?.mode === 'create' && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Почати з</legend>
              {[
                { value: false, title: 'Порожньої схеми', text: 'Ви самі додаєте таблиці' },
                { value: true, title: 'Прикладу «Інтернет-магазин»', text: "4 таблиці та 3 зв'язки для ознайомлення" },
              ].map((o) => (
                <label
                  key={String(o.value)}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50"
                >
                  <input
                    type="radio"
                    name="template"
                    className="mt-0.5 accent-indigo-600"
                    checked={withTemplate === o.value}
                    onChange={() => setWithTemplate(o.value)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{o.title}</span>
                    <span className="block text-xs text-slate-600">{o.text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </form>
      </Modal>
    </>
  )
}