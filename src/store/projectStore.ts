import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Column, OnDeleteAction, Project, Relation, Table } from '../types'
import { TABLE_COLORS } from '../types'
import { nextFreeName } from '../lib/identifiers'
import { shopTemplate } from '../lib/templates'
import { temporal } from 'zundo'
import { autoLayout } from '../lib/layout'

/** Дані для нового зв'язку: усе, крім id (його згенерує сховище). */
export type NewRelation = Omit<Relation, 'id'>

/** Створює нову колонку з типовими налаштуваннями. */
function blankColumn(name: string): Column {
    return {
        id: crypto.randomUUID(),
        name,
        type: 'VARCHAR(255)',
        primaryKey: false,
        notNull: false,
        unique: false,
        defaultValue: '',
    }
}

/** Опис сховища: які дані в ньому є і які дії можна виконувати. */
interface ProjectState {
    projects: Project[]
    createProject: (name: string, withTemplate: boolean) => string   
    addImportedProject: (project: Project) => void
    renameProject: (id: string, name: string) => void
    deleteProject: (id: string) => void
    addTable: (projectId: string) => string | null
    deleteTable: (projectId: string, tableId: string) => void
    applyAutoLayout: (projectId: string) => void

    updateTable: (projectId: string, tableId: string, patch: Partial<Pick<Table, 'name' | 'color'>>) => void
    moveTable: (projectId: string, tableId: string, position: { x: number; y: number }) => void

    addColumn: (projectId: string, tableId: string) => void
    updateColumn: (projectId: string, tableId: string, columnId: string, patch: Partial<Omit<Column, 'id'>>) => void
    moveColumn: (projectId: string, tableId: string, columnId: string, direction: -1 | 1) => void
    deleteColumn: (projectId: string, tableId: string, columnId: string) => void

    addRelation: (projectId: string, relation: NewRelation) => { ok: true } | { ok: false; error: string }
    updateRelation: (projectId: string, relationId: string, onDelete: OnDeleteAction) => void
    deleteRelation: (projectId: string, relationId: string) => void
}

export const useProjectStore = create<ProjectState>()(
    temporal(
        persist(
            (set, get) => {
                /** Змінює один проєкт і оновлює час його редагування. */
                const update = (projectId: string, fn: (p: Project) => Project) =>
                    set((state) => ({
                        projects: state.projects.map((p) =>
                            p.id === projectId ? { ...fn(p), updatedAt: Date.now() } : p,
                        ),
                    }))

                /** Змінює одну таблицю в проєкті. */
                const changeTable = (projectId: string, tableId: string, fn: (t: Table) => Table) =>
                    update(projectId, (p) => ({
                        ...p,
                        tables: p.tables.map((t) => (t.id === tableId ? fn(t) : t)),
                    }))

                return {
                    projects: [],

                    createProject: (name, withTemplate) => {
                        const now = Date.now()
                        const project: Project = withTemplate
                            ? shopTemplate(name)
                            : { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, tables: [], relations: [] }
                        set((state) => ({ projects: [project, ...state.projects] }))
                        return project.id
                    },

                    addImportedProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),

                    renameProject: (id, name) => update(id, (p) => ({ ...p, name })),

                    deleteProject: (id) =>
                        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

                    addTable: (projectId) => {
                        const project = get().projects.find((p) => p.id === projectId)
                        if (!project) return null
                        const n = project.tables.length
                        const table: Table = {
                            id: crypto.randomUUID(),
                            name: nextFreeName('table', project.tables.map((t) => t.name)),
                            color: TABLE_COLORS[n % TABLE_COLORS.length],
                            position: { x: 40 + (n % 4) * 300, y: 40 + Math.floor(n / 4) * 240 },
                            columns: [
                                { id: crypto.randomUUID(), name: 'id', type: 'SERIAL', primaryKey: true, notNull: true, unique: false, defaultValue: '' },
                            ],
                        }
                        update(projectId, (p) => ({ ...p, tables: [...p.tables, table] }))
                        return table.id
                    },

                    deleteTable: (projectId, tableId) =>
                        update(projectId, (p) => ({
                            ...p,
                            tables: p.tables.filter((t) => t.id !== tableId),
                            relations: p.relations.filter((r) => r.fromTableId !== tableId && r.toTableId !== tableId),
                        })),

                    applyAutoLayout: (projectId) =>
                        update(projectId, (p) => {
                            const positions = autoLayout(p)
                            return { ...p, tables: p.tables.map((t) => ({ ...t, position: positions[t.id] ?? t.position })) }
                        }),

                    updateTable: (projectId, tableId, patch) =>
                        changeTable(projectId, tableId, (t) => ({ ...t, ...patch })),

                    moveTable: (projectId, tableId, position) =>
                        changeTable(projectId, tableId, (t) => ({ ...t, position })),

                    addColumn: (projectId, tableId) =>
                        changeTable(projectId, tableId, (t) => ({
                            ...t,
                            columns: [...t.columns, blankColumn(nextFreeName('column', t.columns.map((c) => c.name)))],
                        })),

                    updateColumn: (projectId, tableId, columnId, patch) =>
                        changeTable(projectId, tableId, (t) => ({
                            ...t,
                            columns: t.columns.map((c) => {
                                if (c.id !== columnId) return c
                                const next = { ...c, ...patch }
                                if (patch.primaryKey === true) next.notNull = true // первинний ключ завжди NOT NULL
                                return next
                            }),
                        })),

                    moveColumn: (projectId, tableId, columnId, direction) =>
                        changeTable(projectId, tableId, (t) => {
                            const i = t.columns.findIndex((c) => c.id === columnId)
                            const j = i + direction
                            if (i < 0 || j < 0 || j >= t.columns.length) return t
                            const columns = [...t.columns]
                            const temp = columns[i]
                            columns[i] = columns[j]
                            columns[j] = temp
                            return { ...t, columns }
                        }),

                    deleteColumn: (projectId, tableId, columnId) =>
                        update(projectId, (p) => ({
                            ...p,
                            tables: p.tables.map((t) =>
                                t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) } : t,
                            ),
                            relations: p.relations.filter((r) => r.fromColumnId !== columnId && r.toColumnId !== columnId),
                        })),

                    addRelation: (projectId, relation) => {
                        const project = get().projects.find((p) => p.id === projectId)
                        if (!project) return { ok: false, error: 'Проєкт не знайдено' }
                        if (relation.fromColumnId === relation.toColumnId) {
                            return { ok: false, error: 'Колонка не може посилатися сама на себе' }
                        }
                        if (project.relations.some((r) => r.fromColumnId === relation.fromColumnId)) {
                            return { ok: false, error: "Ця колонка вже є зовнішнім ключем. Спершу видаліть наявний зв'язок." }
                        }
                        update(projectId, (p) => ({ ...p, relations: [...p.relations, { ...relation, id: crypto.randomUUID() }] }))
                        return { ok: true }
                    },

                    updateRelation: (projectId, relationId, onDelete) =>
                        update(projectId, (p) => ({
                            ...p,
                            relations: p.relations.map((r) => (r.id === relationId ? { ...r, onDelete } : r)),
                        })),

                    deleteRelation: (projectId, relationId) =>
                        update(projectId, (p) => ({ ...p, relations: p.relations.filter((r) => r.id !== relationId) })),
                }
            },
            {
                name: 'schemacraft-projects-v1',
                partialize: (s) => ({ projects: s.projects }),
            },
        ),
        {
            limit: 100,
            partialize: (s) => ({ projects: s.projects }),
            equality: (a, b) => a.projects === b.projects,
        },
    )
)

/** Зручна функція: отримати один проєкт за його id. */
export function useProject(projectId: string | undefined) {
    return useProjectStore((s) => s.projects.find((p) => p.id === projectId))
}