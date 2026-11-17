import type { Column, Project, Relation, Table } from '../types'

// Короткі функції для створення тестових даних, щоб не виписывати всі поля в кожному тесті.
let n = 0
const id = () => `id${++n}`

export function column(name: string, patch: Partial<Column> = {}): Column {
    return { id: id(), name, type: 'INTEGER', primaryKey: false, notNull: false, unique: false, defaultValue: '', ...patch }
}

export function table(name: string, columns: Column[]): Table {
    return { id: id(), name, color: 'indigo', position: { x: 0, y: 0 }, columns }
}

export function relation(from: Table, fromCol: Column, to: Table, toCol: Column, patch: Partial<Relation> = {}): Relation {
    return { id: id(), fromTableId: from.id, fromColumnId: fromCol.id, toTableId: to.id, toColumnId: toCol.id, onDelete: 'NO ACTION', ...patch }
}

export function project(tables: Table[], relations: Relation[] = [], name = 'Тест'): Project {
    return { id: id(), name, createdAt: 0, updatedAt: 0, tables, relations }
}