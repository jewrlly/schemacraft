// Модель даних застосунку

export const SQL_TYPES = [
    'SERIAL',
    'BIGSERIAL',
    'INTEGER',
    'BIGINT',
    'SMALLINT',
    'NUMERIC(10,2)',
    'REAL',
    'BOOLEAN',
    'VARCHAR(255)',
    'TEXT',
    'UUID',
    'DATE',
    'TIMESTAMP',
    'JSONB',
] as const

export type SQLType = (typeof SQL_TYPES)[number]

export const ON_DELETE_ACTIONS = ['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT'] as const
export type OnDeleteAction = (typeof ON_DELETE_ACTIONS)[number]

export const TABLE_COLORS = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet'] as const
export type TableColor = (typeof TABLE_COLORS)[number]

export interface Column {
    id: string
    name: string
    type: SQLType
    primaryKey: boolean
    notNull: boolean
    unique: boolean
    defaultValue: string
}

export interface Table {
    id: string
    name: string
    color: TableColor
    position: { x: number; y: number }
    columns: Column[]
}

// Зв'язок «зовнішній ключ»: колонка fromColumnId посилається на колонку toColumnId. 
export interface Relation {
    id: string
    fromTableId: string
    fromColumnId: string
    toTableId: string
    toColumnId: string
    onDelete: OnDeleteAction
}

export interface Project {
    id: string
    name: string 
    createdAt: number
    updatedAt: number
    tables: Table[]
    relations: Relation[]
}