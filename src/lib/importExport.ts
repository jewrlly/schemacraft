import { z } from 'zod'
import { ON_DELETE_ACTIONS, SQL_TYPES, TABLE_COLORS, type Project } from '../types'

/** Максимальний розмір файлу для імпорту — 1 МБ. */
export const MAX_IMPORT_BYTES = 1_000_000

/** Рядок не довший за max символів. */
const text = (max: number) => z.string().max(max)

const columnSchema = z.object({
    id: text(64),
    name: text(63),
    type: z.enum(SQL_TYPES),
    primaryKey: z.boolean(),
    notNull: z.boolean(),
    unique: z.boolean(),
    defaultValue: text(200),
})

const tableSchema = z.object({
    id: text(64),
    name: text(63),
    color: z.enum(TABLE_COLORS),
    position: z.object({ x: z.number(), y: z.number() }),
    columns: z.array(columnSchema).max(200),
})

const relationSchema = z.object({
    id: text(64),
    fromTableId: text(64),
    fromColumnId: text(64),
    toTableId: text(64),
    toColumnId: text(64),
    onDelete: z.enum(ON_DELETE_ACTIONS),
})

const projectSchema = z.object({
    id: text(64),
    name: text(100),
    createdAt: z.number(),
    updatedAt: z.number(),
    tables: z.array(tableSchema).max(300),
    relations: z.array(relationSchema).max(1000),
})

/** Перетворює схему на текст JSON для збереження у файл. */
export function exportProjectJson(project: Project): string {
    return JSON.stringify({ format: 'schemacraft', version: 1, project }, null, 2)
}

export type ImportResult = { ok: true; project: Project } | { ok: false; error: string }

/** Читає схему з тексту JSON і перевіряє розмір, формат і структуру. */
export function importProjectJson(raw: string): ImportResult {
    if (raw.length > MAX_IMPORT_BYTES) return { ok: false, error: 'Файл завеликий (максимум 1 МБ)' }

    let data: unknown
    try {
        data = JSON.parse(raw)
    } catch {
        return { ok: false, error: 'Файл не є коректним JSON' }
    }

    const wrapper = z.object({ format: z.literal('schemacraft'), project: z.unknown() }).safeParse(data)
    if (!wrapper.success) return { ok: false, error: 'Це не файл схеми SchemaCraft' }

    const parsed = projectSchema.safeParse(wrapper.data.project)
    if (!parsed.success) return { ok: false, error: 'Файл пошкоджений: структура схеми некоректна' }

    const project = parsed.data
    // Відкидаємо зв'язки, що вказують на неіснуючі таблиці чи колонки.
    const columnIds = new Set(project.tables.flatMap((t) => t.columns.map((c) => `${t.id}/${c.id}`)))
    const relations = project.relations.filter(
        (r) => columnIds.has(`${r.fromTableId}/${r.fromColumnId}`) && columnIds.has(`${r.toTableId}/${r.toColumnId}`),
    )

    const now = Date.now()
    return { ok: true, project: { ...project, relations, id: crypto.randomUUID(), createdAt: now, updatedAt: now } }
}