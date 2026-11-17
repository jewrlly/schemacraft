import { describe, expect, it } from 'vitest'
import { countBySeverity, validateProject } from './validator'
import { shopTemplate } from './templates'
import { column, project, relation, table } from '../test/factory'

const severities = (p: ReturnType<typeof project>) => validateProject(p).map((i) => i.severity)

describe('validateProject — перевірка схеми', () => {
    it('приклад «Інтернет-магазин» не має помилок і попереджень', () => {
        const counts = countBySeverity(validateProject(shopTemplate('Магазин')))
        expect(counts.error).toBe(0)
        expect(counts.warning).toBe(0)
    })

    it('порожня схема — лише порада', () => {
        expect(severities(project([]))).toEqual(['info'])
    })

    it('таблиця без колонок — помилка', () => {
        expect(severities(project([table('empty', [])]))).toContain('error')
    })

    it('таблиця без первинного ключа — попередження', () => {
        expect(severities(project([table('logs', [column('text')])]))).toContain('warning')
    })

    it('дублікати назв колонок — помилка', () => {
        const p = project([table('users', [column('id', { primaryKey: true }), column('ID')])])
        expect(severities(p)).toContain('error')
    })

    it('різні типи у зв’язку — помилка, а SERIAL і INTEGER сумісні', () => {
        const pk = column('id', { type: 'SERIAL', primaryKey: true })
        const parent = table('parent', [pk])
        const okFk = column('ok_id', { type: 'INTEGER' })
        const badFk = column('bad_id', { type: 'TEXT' })
        const child = table('child', [column('id', { primaryKey: true }), okFk, badFk])

        const good = project([parent, child], [relation(child, okFk, parent, pk)])
        expect(countBySeverity(validateProject(good)).error).toBe(0)

        const bad = project([parent, child], [relation(child, badFk, parent, pk)])
        expect(countBySeverity(validateProject(bad)).error).toBeGreaterThan(0)
    })

    it('ON DELETE SET NULL для NOT NULL колонки — помилка', () => {
        const pk = column('id', { primaryKey: true })
        const parent = table('parent', [pk])
        const fk = column('parent_id', { notNull: true })
        const child = table('child', [column('id', { primaryKey: true }), fk])
        const p = project([parent, child], [relation(child, fk, parent, pk, { onDelete: 'SET NULL' })])
        expect(severities(p)).toContain('error')
    })

    it('пошкоджений зв’язок — помилка', () => {
        const t = table('t', [column('id', { primaryKey: true })])
        const p = project([t], [{ id: 'r', fromTableId: t.id, fromColumnId: 'gone', toTableId: 't2', toColumnId: 'gone', onDelete: 'NO ACTION' }])
        expect(severities(p)).toContain('error')
    })
})