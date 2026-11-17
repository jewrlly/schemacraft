import dagre from '@dagrejs/dagre'
import type { Project } from '../types'

/** Ширина таблиці на діаграмі в пікселях. */
export const NODE_WIDTH = 248
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 30

/** Висота таблиці на діаграмі: заголовок + рядок на кожну колонку. */
export function nodeHeight(columnCount: number): number {
    return HEADER_HEIGHT + Math.max(columnCount, 1) * ROW_HEIGHT + 8
}

/**
 * Автоматичне розташування таблиць (алгоритм шарового розміщення графа dagre):
 * таблиці, на які посилаються, опиняються лівіше, а ті, що посилаються, — правіше.
 */
export function autoLayout(project: Project): Record<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 96, marginx: 24, marginy: 24 })
    g.setDefaultEdgeLabel(() => ({}))

    for (const t of project.tables) {
        g.setNode(t.id, { width: NODE_WIDTH, height: nodeHeight(t.columns.length) })
    }
    for (const r of project.relations) {
        if (g.hasNode(r.fromTableId) && g.hasNode(r.toTableId)) g.setEdge(r.toTableId, r.fromTableId)
    }

    dagre.layout(g)

    const positions: Record<string, { x: number; y: number }> = {}
    for (const t of project.tables) {
        const n = g.node(t.id)
        positions[t.id] = { x: Math.round(n.x - n.width / 2), y: Math.round(n.y - n.height / 2) }
    }
    return positions
}