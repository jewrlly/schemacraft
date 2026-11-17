import { useState } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowLeft, ArrowUp, Check, KeyRound, Link2, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { inputClass, tableColorClasses } from '../components/styles'
import { Button, Field } from '../components/ui'
import { isReservedWord, validateName } from '../lib/identifiers'
import { confirmAction } from '../store/confirmStore'
import { useProject, useProjectStore } from '../store/projectStore'
import { toast } from '../store/toastStore'
import {
  ON_DELETE_ACTIONS,
  SQL_TYPES,
  TABLE_COLORS,
  type Column,
  type OnDeleteAction,
  type Project,
  type SqlType,
  type Table,
} from '../types'

/**
 * Поле з назвою, яке зберігає значення лише тоді, коли воно коректне.
 * Поки користувач вводить некоректну назву, бачить пояснення помилки, а в схемі лишається попередня.
 */
function NameInput({
  id,
  value,
  otherNames,
  onCommit,
  label,
  className,
}: {
  id: string
  value: string
  otherNames: string[]
  onCommit: (name: string) => void
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  // Якщо назву змінили ззовні (наприклад, «Скасувати дію»), оновлюємо поле.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }
  const error = validateName(draft, otherNames)
  const warning = !error && isReservedWord(draft) ? 'Зарезервоване слово SQL — краще обрати іншу назву' : null

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <input
        id={id}
        aria-label={label}
        aria-invalid={!!error}
        className={inputClass(!!error)}
        value={draft}
        maxLength={63}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value)
          if (!validateName(e.target.value, otherNames)) onCommit(e.target.value.trim())
        }}
        onBlur={() => setDraft(value)}
      />
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
      {warning && <p className="text-xs text-amber-700">{warning}</p>}
    </div>
  )
}

/** Перемикач-позначка (PK / NN / UQ): виглядає як кнопка, працює як прапорець. */
function Toggle({ checked, onChange, label, short }: { checked: boolean; onChange: (v: boolean) => void; label: string; short: string }) {
  return (
    <label
      title={label}
      className={clsx(
        'inline-flex min-h-9 w-12 cursor-pointer items-center justify-center gap-1 rounded-md border text-xs font-semibold select-none',
        checked ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      {checked && <Check size={11} strokeWidth={3} />}
      {short}
    </label>
  )
}

/** Один рядок таблиці колонок: назва, тип, позначки, значення за замовчуванням, кнопки. */
function ColumnRow({ project, table, column, index }: { project: Project; table: Table; column: Column; index: number }) {
  const updateColumn = useProjectStore((s) => s.updateColumn)
  const moveColumn = useProjectStore((s) => s.moveColumn)
  const deleteColumn = useProjectStore((s) => s.deleteColumn)
  const isFk = project.relations.some((r) => r.fromColumnId === column.id)
  const others = table.columns.filter((c) => c.id !== column.id).map((c) => c.name)
  const update = (patch: Partial<Column>) => updateColumn(project.id, table.id, column.id, patch)

  const onDelete = async () => {
    const used = project.relations.some((r) => r.fromColumnId === column.id || r.toColumnId === column.id)
    if (used) {
      const ok = await confirmAction({
        title: 'Видалити колонку?',
        text: `Колонка «${column.name}» бере участь у зв'язку — його теж буде видалено.`,
      })
      if (!ok) return
    }
    deleteColumn(project.id, table.id, column.id)
    toast('Колонку видалено')
  }

  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_156px_minmax(0,1fr)_116px] md:items-start md:rounded-none md:border-0 md:border-b md:p-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-2.5 flex w-4 shrink-0 justify-center">
          {column.primaryKey ? (
            <KeyRound size={14} className="text-amber-600" aria-label="первинний ключ" />
          ) : isFk ? (
            <Link2 size={14} className="text-indigo-600" aria-label="зовнішній ключ" />
          ) : null}
        </span>
        <NameInput
          id={`col-${column.id}`}
          label={`Назва колонки ${index + 1}`}
          value={column.name}
          otherNames={others}
          onCommit={(name) => update({ name })}
          className="min-w-0 flex-1"
        />
      </div>

      <div className="order-3 col-span-2 md:order-none md:col-span-1">
        <select
          aria-label={`Тип колонки ${column.name}`}
          className={inputClass()}
          value={column.type}
          onChange={(e) => update({ type: e.target.value as SqlType })}
        >
          {SQL_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="order-4 col-span-2 flex flex-wrap gap-1 md:order-none md:col-span-1">
        <Toggle short="PK" label="Первинний ключ (PRIMARY KEY)" checked={column.primaryKey} onChange={(v) => update({ primaryKey: v })} />
        <Toggle short="NN" label="Обов'язкове значення (NOT NULL)" checked={column.notNull || column.primaryKey} onChange={(v) => update({ notNull: v })} />
        <Toggle short="UQ" label="Унікальне значення (UNIQUE)" checked={column.unique} onChange={(v) => update({ unique: v })} />
      </div>

      <div className="order-5 col-span-2 md:order-none md:col-span-1">
        <input
          aria-label={`Значення за замовчуванням для ${column.name}`}
          className={inputClass()}
          value={column.defaultValue}
          maxLength={200}
          placeholder="не задано"
          onChange={(e) => update({ defaultValue: e.target.value })}
        />
      </div>

      <div className="order-2 flex md:order-none">
        <Button
          variant="ghost"
          className="!px-2"
          aria-label="Перемістити вгору"
          title="Вгору"
          disabled={index === 0}
          onClick={() => moveColumn(project.id, table.id, column.id, -1)}
          icon={<ArrowUp size={15} />}
        />
        <Button
          variant="ghost"
          className="!px-2"
          aria-label="Перемістити вниз"
          title="Вниз"
          disabled={index === table.columns.length - 1}
          onClick={() => moveColumn(project.id, table.id, column.id, 1)}
          icon={<ArrowDown size={15} />}
        />
        <Button
          variant="ghost"
          className="!px-2 hover:!bg-rose-50 hover:!text-rose-700"
          aria-label={`Видалити колонку ${column.name}`}
          title="Видалити"
          onClick={() => void onDelete()}
          icon={<Trash2 size={15} />}
        />
      </div>
    </li>
  )
}

/** Блок «Зовнішні ключі»: створення зв'язків без полотна (зручно на телефоні та з клавіатури). */
function RelationsSection({ project, table }: { project: Project; table: Table }) {
  const addRelation = useProjectStore((s) => s.addRelation)
  const deleteRelation = useProjectStore((s) => s.deleteRelation)
  const updateRelation = useProjectStore((s) => s.updateRelation)
  const outgoing = project.relations.filter((r) => r.fromTableId === table.id)
  const incoming = project.relations.filter((r) => r.toTableId === table.id && r.fromTableId !== table.id)
  const tableById = (id: string) => project.tables.find((t) => t.id === id)

  // Колонки, які ще не є зовнішніми ключами (одна колонка — один зовнішній ключ).
  const freeColumns = table.columns.filter((c) => !project.relations.some((r) => r.fromColumnId === c.id))
  const [fromColumnId, setFromColumnId] = useState('')
  const [toTableId, setToTableId] = useState('')
  const [toColumnId, setToColumnId] = useState('')
  const [onDelete, setOnDelete] = useState<OnDeleteAction>('NO ACTION')
  const targetTable = tableById(toTableId)

  const submit = () => {
    if (!fromColumnId || !toTableId || !toColumnId) {
      toast('Оберіть колонку, таблицю і колонку, на яку посилатися', 'error')
      return
    }
    const result = addRelation(project.id, { fromTableId: table.id, fromColumnId, toTableId, toColumnId, onDelete })
    if (result.ok) {
      toast('Зовнішній ключ додано')
      setFromColumnId('')
      setToTableId('')
      setToColumnId('')
      setOnDelete('NO ACTION')
    } else toast(result.error, 'error')
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="fk-title">
      <h2 id="fk-title" className="font-semibold text-slate-900">
        Зовнішні ключі
      </h2>
      <p className="mt-1 text-sm text-slate-600">Зовнішній ключ пов'язує колонку цієї таблиці з первинним ключем іншої.</p>

      {outgoing.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {outgoing.map((r) => {
            const to = tableById(r.toTableId)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 flex-1 font-mono text-xs text-slate-800">
                  {table.columns.find((c) => c.id === r.fromColumnId)?.name} → {to?.name}.
                  {to?.columns.find((c) => c.id === r.toColumnId)?.name}
                </span>
                <select
                  aria-label="Дія при видаленні"
                  className={clsx(inputClass(), '!min-h-9 !w-auto text-xs')}
                  value={r.onDelete}
                  onChange={(e) => updateRelation(project.id, r.id, e.target.value as OnDeleteAction)}
                >
                  {ON_DELETE_ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      ON DELETE {a}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  className="!px-2 hover:!bg-rose-50 hover:!text-rose-700"
                  aria-label="Видалити зв'язок"
                  icon={<Trash2 size={15} />}
                  onClick={() => {
                    deleteRelation(project.id, r.id)
                    toast("Зв'язок видалено")
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Колонка" htmlFor="fk-from">
          <select id="fk-from" className={inputClass()} value={fromColumnId} onChange={(e) => setFromColumnId(e.target.value)}>
            <option value="">— оберіть —</option>
            {freeColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Посилається на таблицю" htmlFor="fk-table">
          <select
            id="fk-table"
            className={inputClass()}
            value={toTableId}
            onChange={(e) => {
              setToTableId(e.target.value)
              setToColumnId('')
            }}
          >
            <option value="">— оберіть —</option>
            {project.tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Колонку" htmlFor="fk-col">
          <select id="fk-col" className={inputClass()} value={toColumnId} disabled={!targetTable} onChange={(e) => setToColumnId(e.target.value)}>
            <option value="">— оберіть —</option>
            {targetTable?.columns
              .filter((c) => c.id !== fromColumnId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.primaryKey ? ' (PK)' : c.unique ? ' (UQ)' : ''}
                </option>
              ))}
          </select>
        </Field>
        <Field label="При видаленні" htmlFor="fk-ondelete">
          <select id="fk-ondelete" className={inputClass()} value={onDelete} onChange={(e) => setOnDelete(e.target.value as OnDeleteAction)}>
            {ON_DELETE_ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Button type="submit" variant="primary" icon={<Plus size={16} />}>
          Додати
        </Button>
      </form>

      {incoming.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-700">На цю таблицю посилаються</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {incoming.map((r) => {
              const from = tableById(r.fromTableId)
              return (
                <li key={r.id}>
                  <Link
                    to={`/project/${project.id}/table/${r.fromTableId}`}
                    className="inline-flex rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs text-indigo-800 hover:bg-indigo-100"
                  >
                    {from?.name}.{from?.columns.find((c) => c.id === r.fromColumnId)?.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export function TableEditorPage() {
  const { projectId, tableId } = useParams()
  const project = useProject(projectId)
  const navigate = useNavigate()
  const updateTable = useProjectStore((s) => s.updateTable)
  const addColumn = useProjectStore((s) => s.addColumn)
  const deleteTable = useProjectStore((s) => s.deleteTable)
  const table = project?.tables.find((t) => t.id === tableId)

  if (!project) return <NotFound what="Схему" />
  if (!table) return <NotFound what="Таблицю" />

  const otherTableNames = project.tables.filter((t) => t.id !== table.id).map((t) => t.name)

  const onDeleteTable = async () => {
    const ok = await confirmAction({
      title: 'Видалити таблицю?',
      text: `Таблицю «${table.name}» і всі її зв'язки буде видалено.`,
    })
    if (!ok) return
    deleteTable(project.id, table.id)
    toast('Таблицю видалено')
    navigate(`/project/${project.id}`)
  }

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name, to: `/project/${project.id}` }, { label: table.name }]}
        actions={
          <>
            <Button variant="ghost" className="hover:!bg-rose-50 hover:!text-rose-700" icon={<Trash2 size={16} />} onClick={() => void onDeleteTable()}>
              Видалити таблицю
            </Button>
            <Link
              to={`/project/${project.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <ArrowLeft size={16} /> До діаграми
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Властивості таблиці">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Назва таблиці" htmlFor="table-name">
                <NameInput
                  id="table-name"
                  label="Назва таблиці"
                  value={table.name}
                  otherNames={otherTableNames}
                  onCommit={(name) => updateTable(project.id, table.id, { name })}
                />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-slate-700">Колір</legend>
                <div className="flex gap-1.5">
                  {TABLE_COLORS.map((c) => (
                    <label
                      key={c}
                      className={clsx(
                        'flex size-10 cursor-pointer items-center justify-center rounded-lg border-2',
                        table.color === c ? 'border-slate-800' : 'border-transparent hover:border-slate-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="table-color"
                        className="sr-only"
                        checked={table.color === c}
                        onChange={() => updateTable(project.id, table.id, { color: c })}
                        aria-label={`Колір ${c}`}
                      />
                      <span className={clsx('size-6 rounded-full', tableColorClasses[c].dot)} />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
              <Check size={14} /> Коректні зміни зберігаються автоматично
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="cols-title">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:px-5">
              <div>
                <h2 id="cols-title" className="font-semibold text-slate-900">
                  Колонки ({table.columns.length})
                </h2>
                <p className="text-xs text-slate-600">PK — первинний ключ, NN — обов'язкове значення, UQ — унікальне значення</p>
              </div>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => addColumn(project.id, table.id)}>
                Колонка
              </Button>
            </div>
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_156px_minmax(0,1fr)_116px] gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase md:grid">
              <span className="pl-6">Назва</span>
              <span>Тип</span>
              <span>Обмеження</span>
              <span>За замовчуванням</span>
              <span />
            </div>
            {table.columns.length === 0 ? (
              <p className="p-5 text-sm text-slate-600">У таблиці немає колонок. Натисніть «Колонка», щоб додати першу.</p>
            ) : (
              <ul className="flex flex-col gap-3 p-3 md:gap-0 md:p-0">
                {table.columns.map((c, i) => (
                  <ColumnRow key={c.id} project={project} table={table} column={c} index={i} />
                ))}
              </ul>
            )}
          </section>

          <RelationsSection project={project} table={table} />
        </div>
      </div>
    </>
  )
}