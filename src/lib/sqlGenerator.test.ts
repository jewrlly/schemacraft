import { describe, expect, it } from 'vitest'
import { generateSql } from './sqlGenerator'
import { shopTemplate } from './templates'
import { column, project, relation, table } from '../test/factory'

const DATE = new Date('2026-11-05T10:00:00Z')

describe('generateSql — генерація SQL-скрипту', () => {
    it('для порожньої схеми не генерує таблиць', () => {
        expect(generateSql(project([]), DATE)).not.toContain('CREATE TABLE')
    })

    it('генерує CREATE TABLE з PK, NOT NULL, UNIQUE і DEFAULT', () => {
        const t = table('users', [
            column('id', { type: 'SERIAL', primaryKey: true, notNull: true }),
            column('email', { type: 'VARCHAR(255)', notNull: true, unique: true }),
            column('active', { type: 'BOOLEAN', defaultValue: 'true' }),
        ])
        const sql = generateSql(project([t]), DATE)
        expect(sql).toContain('CREATE TABLE "users" (')
        expect(sql).toContain('"email" VARCHAR(255) NOT NULL')
        expect(sql).toContain('DEFAULT TRUE')
        expect(sql).toContain('PRIMARY KEY ("id")')
        expect(sql).toContain('UNIQUE ("email")')
    })

    it('підтримує складений первинний ключ', () => {
        const t = table('links', [column('a', { primaryKey: true }), column('b', { primaryKey: true })])
        expect(generateSql(project([t]), DATE)).toContain('PRIMARY KEY ("a", "b")')
    })

    it('додає зовнішні ключі після створення всіх таблиць', () => {
        const userId = column('id', { type: 'SERIAL', primaryKey: true })
        const users = table('users', [userId])
        const fk = column('user_id', { notNull: true })
        const posts = table('posts', [column('id', { type: 'SERIAL', primaryKey: true }), fk])
        // таблиця з посиланням іде першою — порядок не має значення
        const sql = generateSql(project([posts, users], [relation(posts, fk, users, userId, { onDelete: 'CASCADE' })]), DATE)

        expect(sql.indexOf('FOREIGN KEY')).toBeGreaterThan(sql.lastIndexOf('CREATE TABLE'))
        expect(sql).toContain('REFERENCES "users" ("id") ON DELETE CASCADE')
        expect(sql).toContain('CREATE INDEX')
    })

    it('коректно обробляє циклічні зв’язки', () => {
        const aId = column('id', { primaryKey: true })
        const bId = column('id', { primaryKey: true })
        const aRef = column('b_id')
        const bRef = column('a_id')
        const a = table('a', [aId, aRef])
        const b = table('b', [bId, bRef])
        const sql = generateSql(project([a, b], [relation(a, aRef, b, bId), relation(b, bRef, a, aId)]), DATE)
        expect(sql.match(/FOREIGN KEY/g)).toHaveLength(2)
    })

    it('пропускає пошкоджений зв’язок замість того, щоб падати', () => {
        const t = table('t', [column('id', { primaryKey: true })])
        const broken = { id: 'x', fromTableId: t.id, fromColumnId: 'missing', toTableId: t.id, toColumnId: 'missing', onDelete: 'NO ACTION' as const }
        expect(() => generateSql(project([t], [broken]), DATE)).not.toThrow()
    })

    it('назва проєкту з переносом рядка не ламає коментар', () => {
        const sql = generateSql(project([], [], 'Shop\nDROP TABLE users;'), DATE)
        expect(sql.split('\n').some((line) => line.startsWith('DROP'))).toBe(false)
    })

    it('генерує скрипт для прикладу «Інтернет-магазин»', () => {
        const sql = generateSql(shopTemplate('Магазин'), DATE)
        expect(sql.match(/CREATE TABLE/g)).toHaveLength(4)
        expect(sql.match(/FOREIGN KEY/g)).toHaveLength(3)
    })
})