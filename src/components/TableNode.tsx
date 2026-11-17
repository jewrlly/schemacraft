import { memo } from 'react'
import clsx from 'clsx'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { AlertTriangle, KeyRound, Link2, Pencil } from 'lucide-react'
import type { Table } from '../types'
import { NODE_WIDTH } from '../lib/layout'
import { tableColorClasses } from './styles'

/** Дані, які отримує кожен вузол діаграми. */
export type TableNodeData = {
  table: Table
  fkColumnIds: Set<string>
  errorCount: number
  highlighted: boolean
  onOpen: (tableId: string) => void
}

export type TableNodeType = Node<TableNodeData, 'table'>

/** Вузол діаграми — одна таблиця бази даних. У кожної колонки є точки для з'єднання зв'язком. */
function TableNodeView({ data, selected }: NodeProps<TableNodeType>) {
  const { table, fkColumnIds, errorCount, highlighted, onOpen } = data
  const colors = tableColorClasses[table.color]

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={clsx(
        'rounded-xl border bg-white shadow-sm transition-shadow',
        selected ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' : 'border-slate-300',
        highlighted && 'ring-4 ring-rose-300',
      )}
      onDoubleClick={() => onOpen(table.id)}
    >
      <div className={clsx('flex h-11 items-center gap-2 rounded-t-xl border-b px-3', colors.header)}>
        <span className={clsx('size-2.5 shrink-0 rounded-full', colors.dot)} />
        <span className="min-w-0 flex-1 truncate font-semibold" title={table.name}>
          {table.name}
        </span>
        {errorCount > 0 && (
          <span title={`Помилок: ${errorCount}`} className="flex items-center gap-0.5 text-xs font-semibold text-rose-700">
            <AlertTriangle size={14} /> {errorCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => onOpen(table.id)}
          className="nodrag flex size-7 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-white/80 hover:text-indigo-700"
          aria-label={`Редагувати таблицю ${table.name}`}
          title="Редагувати таблицю"
        >
          <Pencil size={14} />
        </button>
      </div>

      <ul className="py-1">
        {table.columns.length === 0 && <li className="px-3 py-1.5 text-xs text-slate-500 italic">немає колонок</li>}
        {table.columns.map((col) => (
          <li key={col.id} className="relative flex h-[30px] items-center gap-2 px-3 text-[13px]">
            <Handle type="target" position={Position.Left} id={`${col.id}-t`} />
            <span className="flex w-4 shrink-0 justify-center">
              {col.primaryKey ? (
                <KeyRound size={13} className="text-amber-600" aria-label="первинний ключ" />
              ) : fkColumnIds.has(col.id) ? (
                <Link2 size={13} className="text-indigo-600" aria-label="зовнішній ключ" />
              ) : null}
            </span>
            <span className={clsx('min-w-0 flex-1 truncate', col.primaryKey ? 'font-semibold text-slate-900' : 'text-slate-800')}>
              {col.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-slate-500">{col.type.toLowerCase()}</span>
            <Handle type="source" position={Position.Right} id={`${col.id}-s`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export const TableNode = memo(TableNodeView)