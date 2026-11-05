import { create} from 'zustand'
import {persist} from 'zustand/middleware'
import type { Project, Table } from '../types'
import { TABLE_COLORS } from '../types'
import { nextFreeName } from '../lib/identifiers'

/** Опис сховища: які дані в ньому є і які дії можна виконувати. */
interface ProjectState {
    projects: Project[]
    createProject: (name: string) => string
    renameProject: (id: string, name: string) => void
    deleteProject: (id: string) => void
    addTable: (projectId: string) => string | null
    deleteTable: (projectId: string, tableId: string) => void
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set, get) => {
            /** Змінює один проєкт і оновлює час його редагування. */
            const update = (projectId: string, fn: (p: Project) => Project) => 
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId ? { ...fn(p), updatedAt: Date.now() } : p,
                    ),
                }))
                
            return {
                projects: [],

                createProject: (name) => {
                    const now = Date.now()
                    const project: Project = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, tables: [], relations: [] }
                    set((state) => ({ projects: [project, ...state.projects] }))
                    return project.id
                },

                renameProject: (id, name) => update(id, (p) => ({ ...p, name})),

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
                        position: { x: 40 + (n % 4) * 300, y: 40 + Math.floor(n / 4) * 240},
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
            }
        },
        {
            name: 'schemacraft-projects-v1',
            partialize: (s) => ({ projects: s.projects}),
        },
    ),
)

/** Зручна функція: отримати один проєкт за його id. */
export function useProject(projectId: string | undefined) {
    return useProjectStore((s) => s.projects.find((p) => p.id === projectId))
}