import type { Project, Table } from '../types'
import { formatDefault, quoteIdent, safeComment } from './identifiers'

const MAX_IDENT = 63

/** Назва обмеження (constraint), наприклад "orders_pkey"; не довша за 63 символи. */
function constraintName(...parts: string[]): string {
    return quoteIdent(parts.join('_').slice(0, MAX_IDENT))
}

/** CREATE TABLE для однієї таблиці. */
function createTableSql(table: Table): string {
    const lines: string[] = []

    for (const col of table.columns) {
        let line = `  ${quoteIdent(col.name)} ${col.type}`
        if (col.notNull || col.primaryKey) line += ' NOT NULL'
        const def = formatDefault(col.defaultValue)
        if (def !== null) line += ` DEFAULT ${def}`
        lines.push(line)
    }

    const pkColumns = table.columns.filter((c) => c.primaryKey)
    if (pkColumns.length > 0) {
        lines.push(
            `  CONSTRAINT ${constraintName(table.name, 'pkey')} PRIMARY KEY (${pkColumns
                .map((c) => quoteIdent(c.name))
                .join(', ')})`,
        )
    }

    for (const col of table.columns) {
        if (col.unique && !(col.primaryKey && pkColumns.length === 1)) {
            lines.push(`  CONSTRAINT ${constraintName(table.name, col.name, 'key')} UNIQUE (${quoteIdent(col.name)})`)
        }
    }

    return `CREATE TABLE ${quoteIdent(table.name)} (\n${lines.join(',\n')}\n);`
}

/**
 * Генерує SQL-скрипт (діалект PostgreSQL) для всієї схеми.
 *
 * Алгоритм:
 *  1. для кожної таблиці — CREATE TABLE з колонками, первинним ключем та обмеженнями UNIQUE;
 *  2. після створення всіх таблиць — ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY для кожного зв'язку.
 *     Зовнішні ключі додаються окремо в кінці, тому порядок таблиць не має значення
 *     і навіть циклічні зв'язки (A → B → A) генеруються коректно;
 *  3. індекс для кожної колонки зовнішнього ключа (PostgreSQL не створює їх автоматично).
 */
export function generateSql(project: Project, now: Date = new Date()): string {
    const out: string[] = []
    out.push('-- Згенеровано SchemaCraft')
    out.push(`-- Проєкт: ${safeComment(project.name)}`)
    out.push(`-- Дата: ${now.toISOString().slice(0, 19).replace('T', ' ')}`)
    out.push('-- Діалект: PostgreSQL')
    out.push('')

    if (project.tables.length === 0) {
        out.push('-- Схема порожня: додайте хоча б одну таблицю.')
        return out.join('\n') + '\n'
    }

    for (const table of project.tables) {
        out.push(createTableSql(table))
        out.push('')
    }

    const tablesById = new Map(project.tables.map((t) => [t.id, t]))
    const fkLines: string[] = []
    const indexLines: string[] = []

    for (const rel of project.relations) {
        const from = tablesById.get(rel.fromTableId)
        const to = tablesById.get(rel.toTableId)
        const fromCol = from?.columns.find((c) => c.id === rel.fromColumnId)
        const toCol = to?.columns.find((c) => c.id === rel.toColumnId)
        if (!from || !to || !fromCol || !toCol) continue // пошкоджений зв'язок пропускаємо

        fkLines.push(
            `ALTER TABLE ${quoteIdent(from.name)} ADD CONSTRAINT ${constraintName(from.name, fromCol.name, 'fkey')}\n` +
            `  FOREIGN KEY (${quoteIdent(fromCol.name)}) REFERENCES ${quoteIdent(to.name)} (${quoteIdent(toCol.name)})` +
            (rel.onDelete !== 'NO ACTION' ? ` ON DELETE ${rel.onDelete}` : '') +
            ';',
        )
        indexLines.push(
            `CREATE INDEX ${constraintName(from.name, fromCol.name, 'idx')} ON ${quoteIdent(from.name)} (${quoteIdent(fromCol.name)});`,
        )
    }

    if (fkLines.length > 0) {
        out.push('-- Зовнішні ключі')
        out.push(...fkLines)
        out.push('')
        out.push('-- Індекси для зовнішніх ключів')
        out.push(...indexLines)
        out.push('')
    }

    return out.join('\n')
}