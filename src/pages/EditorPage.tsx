import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { useStore } from 'zustand'
import {
  AlertTriangle,
  Code2,
  KeyRound,
  LayoutGrid,
  Link2,
  List,
  Network,
  Pencil,
  Plus,
  Redo2,
  Table2,
  Trash2,
  Undo2,
  Workflow,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageBar } from '../components/AppShell'
import { NotFound } from '../components/NotFound'
import { TableNode, type TableNodeType } from '../components/TableNode'
import { inputClass, tableColorClasses } from '../components/styles'
import { Badge, Button, EmptyState } from '../components/ui'
import { countBySeverity, validateProject } from '../lib/validator'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { confirmAction } from '../store/confirmStore'
import { useProject, useProjectStore } from '../store/projectStore'
import { toast } from '../store/toastStore'
import { ON_DELETE_ACTIONS, type OnDeleteAction, type Project } from '../types'

const nodeTypes = { table: TableNode }

/** Діаграма: таблиці, які можна перетягувати, і зв'язки між ними. */
function Diagram({ project }: { project: Project }) {
  const navigate = useNavigate()
  const moveTable = useProjectStore((s) => s.moveTable)
  const addRelation = useProjectStore((s) => s.addRelation)
  const deleteTable = useProjectStore((s) => s.deleteTable)
  const deleteRelation = useProjectStore((s) => s.deleteRelation)
  const updateRelation = useProjectStore((s) => s.updateRelation)

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const openTable = useCallback(
    (tableId: string) => navigate(`/project/${project.id}/table/${tableId}`),
    [navigate, project.id],
  )

  // Колонки, які є зовнішніми ключами, — щоб показати біля них значок ланцюжка.
  const fkColumnIds = useMemo(() => new Set(project.relations.map((r) => r.fromColumnId)), [project.relations])

  // Таблиці схеми → вузли діаграми.
  const buildNodes = useCallback(
    (): TableNodeType[] =>
      project.tables.map((t) => ({
        id: t.id,
        type: 'table',
        position: t.position,
        selected: t.id === selectedTableId,
        data: { table: t, fkColumnIds, onOpen: openTable },
      })),
    [project.tables, fkColumnIds, openTable, selectedTableId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeType>(buildNodes())
  useEffect(() => setNodes(buildNodes()), [buildNodes, setNodes])

  // Зв'язки схеми → лінії діаграми.
  // Лінія йде від первинного ключа до зовнішнього ключа; стрілка вказує на таблицю, на яку посилаються.
  const edges: Edge[] = useMemo(
    () =>
      project.relations.map((r) => ({
        id: r.id,
        source: r.toTableId,
        sourceHandle: `${r.toColumnId}-s`,
        target: r.fromTableId,
        targetHandle: `${r.fromColumnId}-t`,
        type: 'smoothstep',
        selected: r.id === selectedEdgeId,
        markerStart: { type: MarkerType.ArrowClosed, color: '#64748b' },
        style: { stroke: '#64748b', strokeWidth: 1.75, strokeDasharray: r.onDelete === 'CASCADE' ? '6 4' : undefined },
        interactionWidth: 24,
      })),
    [project.relations, selectedEdgeId],
  )

  /** Користувач з'єднав дві колонки лінією. */
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.sourceHandle || !c.targetHandle) return
      const a = { tableId: c.source, columnId: c.sourceHandle.replace(/-s$/, '') }
      const b = { tableId: c.target, columnId: c.targetHandle.replace(/-t$/, '') }
      // Напрямок визначається автоматично: зовнішнім ключем стає та колонка, яка НЕ є ключем чи унікальною.
      const isKey = (x: typeof a) => {
        const col = project.tables.find((t) => t.id === x.tableId)?.columns.find((cc) => cc.id === x.columnId)
        return !!col && (col.primaryKey || col.unique)
      }
      const [fk, ref] = isKey(a) && !isKey(b) ? [b, a] : [a, b]
      const result = addRelation(project.id, {
        fromTableId: fk.tableId,
        fromColumnId: fk.columnId,
        toTableId: ref.tableId,
        toColumnId: ref.columnId,
        onDelete: 'NO ACTION',
      })
      if (result.ok) toast("Зв'язок створено")
      else toast(result.error, 'error')
    },
    [addRelation, project.id, project.tables],
  )

  const selectedTable = project.tables.find((t) => t.id === selectedTableId)
  const selectedRelation = project.relations.find((r) => r.id === selectedEdgeId)

  /** Видалити виділену таблицю (з підтвердженням) або виділений зв'язок. */
  const removeSelected = useCallback(async () => {
    if (selectedTable) {
      const ok = await confirmAction({
        title: 'Видалити таблицю?',
        text: `Таблицю «${selectedTable.name}» і всі її зв'язки буде видалено.`,
      })
      if (ok) {
        deleteTable(project.id, selectedTable.id)
        setSelectedTableId(null)
        toast('Таблицю видалено')
      }
    } else if (selectedRelation) {
      deleteRelation(project.id, selectedRelation.id)
      setSelectedEdgeId(null)
      toast("Зв'язок видалено")
    }
  }, [selectedTable, selectedRelation, deleteTable, deleteRelation, project.id])

  // Клавіша Delete / Backspace видаляє виділене (але не тоді, коли користувач друкує в полі).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, dialog')) return
      if (e.key === 'Delete' || e.key === 'Backspace') void removeSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeSelected])

  /** Підпис виділеного зв'язку, наприклад «orders.customer_id → customers.id». */
  const relationLabel = (() => {
    if (!selectedRelation) return ''
    const from = project.tables.find((t) => t.id === selectedRelation.fromTableId)
    const to = project.tables.find((t) => t.id === selectedRelation.toTableId)
    const fc = from?.columns.find((c) => c.id === selectedRelation.fromColumnId)
    const tc = to?.columns.find((c) => c.id === selectedRelation.toColumnId)
    return `${from?.name}.${fc?.name} → ${to?.name}.${tc?.name}`
  })()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={(_, node) =>
        moveTable(project.id, node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) })
      }
      onNodeClick={(_, node) => {
        setSelectedTableId(node.id)
        setSelectedEdgeId(null)
      }}
      onEdgeClick={(_, edge) => {
        setSelectedEdgeId(edge.id)
        setSelectedTableId(null)
      }}
      onPaneClick={() => {
        setSelectedTableId(null)
        setSelectedEdgeId(null)
      }}
      onConnect={onConnect}
      deleteKeyCode={null}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1.2} color="#cbd5e1" />
      <Controls showInteractive={false} position="bottom-right" />

      {project.tables.length === 0 && (
        <Panel position="top-center" className="!m-0 !mt-10 w-full max-w-md px-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={<Table2 size={28} />}
              title="Схема поки порожня"
              text="Додайте першу таблицю кнопкою «Таблиця» вгорі. Потім з'єднайте колонки таблиць, щоб створити зв'язки."
            />
          </div>
        </Panel>
      )}

      {project.tables.length > 1 && project.relations.length === 0 && !selectedTable && (
        <Panel position="bottom-left" className="max-w-xs rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 shadow-sm">
          <b>Як створити зв'язок:</b> потягніть від точки біля первинного ключа (праворуч) до точки біля колонки іншої таблиці
          (ліворуч). Напрямок визначиться автоматично.
        </Panel>
      )}

      {(selectedTable || selectedRelation) && (
        <Panel position="bottom-center" className="!mb-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {selectedTable && (
              <>
                <span className="px-2 text-sm font-medium text-slate-800">{selectedTable.name}</span>
                <Button variant="primary" icon={<Pencil size={15} />} onClick={() => openTable(selectedTable.id)}>
                  Редагувати
                </Button>
              </>
            )}
            {selectedRelation && (
              <>
                <span className="max-w-56 truncate px-2 font-mono text-xs text-slate-700" title={relationLabel}>
                  {relationLabel}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  ON DELETE
                  <select
                    className={clsx(inputClass(), '!min-h-9 !w-auto')}
                    value={selectedRelation.onDelete}
                    onChange={(e) => updateRelation(project.id, selectedRelation.id, e.target.value as OnDeleteAction)}
                  >
                    {ON_DELETE_ACTIONS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <Button
              variant="ghost"
              className="hover:!bg-rose-50 hover:!text-rose-700"
              icon={<Trash2 size={15} />}
              onClick={() => void removeSelected()}
            >
              Видалити
            </Button>
          </div>
        </Panel>
      )}
    </ReactFlow>
  )
}

/** Стан історії змін: чи можна скасувати або повторити, і функції для цього. */
function useUndoRedo() {
  const temporal = useProjectStore.temporal
  const canUndo = useStore(temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(temporal, (s) => s.futureStates.length > 0)
  return {
    canUndo,
    canRedo,
    undo: () => temporal.getState().undo(),
    redo: () => temporal.getState().redo(),
  }
}

/** Перегляд «списком» — зручний на телефоні, де працювати з полотном незручно. */
function TableList({ project }: { project: Project }) {
  const tableName = (id: string) => project.tables.find((t) => t.id === id)?.name ?? '?'
  const colName = (tid: string, cid: string) =>
    project.tables.find((t) => t.id === tid)?.columns.find((c) => c.id === cid)?.name ?? '?'
  const fkColumnIds = new Set(project.relations.map((r) => r.fromColumnId))

  if (project.tables.length === 0) {
    return <EmptyState icon={<Table2 size={28} />} title="Схема поки порожня" text="Додайте першу таблицю кнопкою «Таблиця» вгорі." />
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Таблиці ({project.tables.length})</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {project.tables.map((t) => (
            <li key={t.id}>
              <Link
                to={`/project/${project.id}/table/${t.id}`}
                className="block rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300"
              >
                <div className={clsx('flex items-center gap-2 rounded-t-xl border-b px-4 py-2.5', tableColorClasses[t.color].header)}>
                  <span className={clsx('size-2.5 rounded-full', tableColorClasses[t.color].dot)} />
                  <span className="flex-1 truncate font-semibold">{t.name}</span>
                  <Pencil size={15} className="text-slate-500" />
                </div>
                <ul className="px-4 py-2 text-sm">
                  {t.columns.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 py-1">
                      <span className="w-4">
                        {c.primaryKey ? (
                          <KeyRound size={13} className="text-amber-600" />
                        ) : fkColumnIds.has(c.id) ? (
                          <Link2 size={13} className="text-indigo-600" />
                        ) : null}
                      </span>
                      <span className="flex-1 truncate text-slate-800">{c.name}</span>
                      <span className="font-mono text-xs text-slate-500">{c.type.toLowerCase()}</span>
                    </li>
                  ))}
                  {t.columns.length === 0 && <li className="py-1 text-slate-500 italic">немає колонок</li>}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Зв'язки ({project.relations.length})</h2>
        {project.relations.length === 0 ? (
          <p className="text-sm text-slate-600">Зв'язків ще немає. Додати зовнішній ключ можна на сторінці редагування таблиці.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {project.relations.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-xs text-slate-700">
                {tableName(r.fromTableId)}.{colName(r.fromTableId, r.fromColumnId)} → {tableName(r.toTableId)}.
                {colName(r.toTableId, r.toColumnId)}
                {r.onDelete !== 'NO ACTION' && <span className="ml-2 text-slate-500">ON DELETE {r.onDelete}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function EditorPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const navigate = useNavigate()
  const addTable = useProjectStore((s) => s.addTable)
  const applyAutoLayout = useProjectStore((s) => s.applyAutoLayout)
  const { canUndo, canRedo, undo, redo } = useUndoRedo()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [view, setView] = useState<'diagram' | 'list'>(() =>
    window.matchMedia('(max-width: 767px)').matches ? 'list' : 'diagram',
  )

  // Історія «скасувати / повторити» — окрема для кожного відкриття схеми.
  const openedFor = useRef<string | null>(null)
  useEffect(() => {
    if (projectId && openedFor.current !== projectId) {
      openedFor.current = projectId
      useProjectStore.temporal.getState().clear()
    }
  }, [projectId])

  // Ctrl+Z — скасувати, Ctrl+Y або Ctrl+Shift+Z — повторити.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const issues = useMemo(() => (project ? validateProject(project) : []), [project])
  const counts = countBySeverity(issues)

  if (!project) return <NotFound what="Схему" />

  const onAddTable = () => {
    const id = addTable(project.id)
    // У вигляді «Список» одразу відкриваємо нову таблицю, бо на діаграмі її не видно.
    if (id && view === 'list') navigate(`/project/${project.id}/table/${id}`)
    else toast('Таблицю додано. Двічі клацніть по ній, щоб редагувати.', 'info')
  }

  return (
    <>
      <PageBar
        crumbs={[{ label: 'Мої схеми', to: '/' }, { label: project.name }]}
        actions={
          <>
            <Link
              to={`/project/${project.id}/validation`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <AlertTriangle size={16} className={counts.error > 0 ? 'text-rose-600' : 'text-slate-500'} />
              Перевірка
              {counts.error + counts.warning > 0 && (
                <Badge tone={counts.error > 0 ? 'red' : 'amber'}>{counts.error + counts.warning}</Badge>
              )}
            </Link>
            <Link
              to={`/project/${project.id}/sql`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Code2 size={16} /> SQL
            </Link>
          </>
        }
      />

      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 sm:px-6"
        role="toolbar"
        aria-label="Інструменти редактора"
      >
        <Button variant="primary" icon={<Plus size={16} />} onClick={onAddTable}>
          Таблиця
        </Button>
        <Button
          icon={<LayoutGrid size={16} />}
          disabled={project.tables.length < 2}
          title="Автоматично розташувати таблиці"
          onClick={() => {
            applyAutoLayout(project.id)
            setView('diagram')
            toast('Таблиці впорядковано')
          }}
        >
          <span className="hidden sm:inline">Впорядкувати</span>
        </Button>
        <div className="flex">
          <Button variant="ghost" icon={<Undo2 size={16} />} onClick={undo} disabled={!canUndo} aria-label="Скасувати дію (Ctrl+Z)" title="Скасувати дію (Ctrl+Z)" />
          <Button variant="ghost" icon={<Redo2 size={16} />} onClick={redo} disabled={!canRedo} aria-label="Повторити дію (Ctrl+Y)" title="Повторити дію (Ctrl+Y)" />
        </div>
        <div className="ml-auto flex rounded-lg border border-slate-300 bg-slate-50 p-0.5" role="group" aria-label="Вигляд">
          {[
            { v: 'diagram' as const, label: 'Діаграма', icon: <Network size={15} /> },
            { v: 'list' as const, label: 'Список', icon: <List size={15} /> },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              aria-pressed={view === o.v}
              onClick={() => setView(o.v)}
              className={clsx(
                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium',
                view === o.v ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {o.icon}
              <span className="sr-only sm:not-sr-only">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={clsx('relative min-h-0 flex-1', view === 'list' && 'overflow-y-auto')}>
        {view === 'diagram' ? (
          <ReactFlowProvider>
            <Diagram project={project} />
          </ReactFlowProvider>
        ) : (
          <TableList project={project} />
        )}
      </div>

      {view === 'diagram' && isMobile && project.tables.length > 0 && (
        <p className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          <Workflow size={14} className="shrink-0" /> Масштабуйте двома пальцями. Для редагування зручніше перейти у «Список».
        </p>
      )}
    </>
  )
}