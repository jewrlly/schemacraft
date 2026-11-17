import type { Project } from '../types'
import { isReservedWord, validateName } from './identifiers'
import { areTypesCompatible } from './sqlTypes'

export type Severity = 'error' | 'warning' | 'info'

/** Одна знайдена проблема. */
export interface Issue {
    id: string
    severity: Severity
    message: string
    hint: string
    tableId?: string
}

/**
 * Перевіряє схему на помилки (через них SQL не виконається),
 * попередження (SQL виконається, але є ризик) та поради.
 */
export function validateProject(project: Project): Issue[] {
    const issues: Issue[] = []
    const add = (issue: Omit<Issue, 'id'>) => issues.push({ ...issue, id: `${issues.length}` })

    // Правило 1: порожня схема
    if (project.tables.length === 0) {
        add({ severity: 'info', message: 'Схема порожня', hint: 'Додайте першу таблицю в редакторі схеми.' })
        return issues
    }

    const tablesById = new Map(project.tables.map((t) => [t.id, t]))

    project.tables.forEach((table, index) => {
        // Правила 4 і 6: назва таблиці (некоректна / дублікат / зарезервоване слово)
        const otherTableNames = project.tables.filter((_, i) => i < index).map((t) => t.name)
        const nameError = validateName(table.name, otherTableNames)
        if (nameError) {
            add({
                severity: 'error',
                tableId: table.id,
                message: `Таблиця «${table.name}»: ${nameError.toLowerCase()}`,
                hint: 'Перейменуйте таблицю.',
            })
        } else if (isReservedWord(table.name)) {
            add({
                severity: 'warning',
                tableId: table.id,
                message: `Назва таблиці «${table.name}» — зарезервоване слово SQL`,
                hint: 'Скрипт виконається завдяки лапкам, але в запитах таку таблицю завжди доведеться брати в лапки. Краще перейменувати (наприклад, на «app_users»).',
            })
        }

        // Правило 2: таблиця без колонок
        if (table.columns.length === 0) {
            add({
                severity: 'error',
                tableId: table.id,
                message: `Таблиця «${table.name}» не має жодної колонки`,
                hint: 'Додайте колонки або видаліть таблицю.',
            })
            return
        }

        // Правило 3: немає первинного ключа
        if (!table.columns.some((c) => c.primaryKey)) {
            add({
                severity: 'warning',
                tableId: table.id,
                message: `Таблиця «${table.name}» не має первинного ключа`,
                hint: 'Без первинного ключа рядки неможливо однозначно знайти чи оновити. Додайте колонку «id» з позначкою PK.',
            })
        }

        // Правила 5 і 6: назви колонок
        table.columns.forEach((col, colIndex) => {
            const otherColumnNames = table.columns.filter((_, i) => i < colIndex).map((c) => c.name)
            const colError = validateName(col.name, otherColumnNames)
            if (colError) {
                add({
                    severity: 'error',
                    tableId: table.id,
                    message: `Колонка «${table.name}.${col.name}»: ${colError.toLowerCase()}`,
                    hint: 'Перейменуйте колонку.',
                })
            } else if (isReservedWord(col.name)) {
                add({
                    severity: 'warning',
                    tableId: table.id,
                    message: `Назва колонки «${table.name}.${col.name}» — зарезервоване слово SQL`,
                    hint: 'Краще обрати іншу назву, щоб не брати її в лапки в кожному запиті.',
                })
            }
        })
    })

    for (const rel of project.relations) {
        const from = tablesById.get(rel.fromTableId)
        const to = tablesById.get(rel.toTableId)
        const fromCol = from?.columns.find((c) => c.id === rel.fromColumnId)
        const toCol = to?.columns.find((c) => c.id === rel.toColumnId)

        // Правило 7: зв'язок посилається на те, чого вже немає
        if (!from || !to || !fromCol || !toCol) {
            add({
                severity: 'error',
                tableId: from?.id,
                message: "Зв'язок посилається на таблицю або колонку, якої вже немає",
                hint: "Видаліть цей зв'язок і створіть його заново.",
            })
            continue
        }

        const label = `${from.name}.${fromCol.name} → ${to.name}.${toCol.name}`

        // Правило 8: несумісні типи
        if (!areTypesCompatible(fromCol.type, toCol.type)) {
            add({
                severity: 'error',
                tableId: from.id,
                message: `Зв'язок ${label}: різні типи (${fromCol.type} і ${toCol.type})`,
                hint: 'Тип зовнішнього ключа має збігатися з типом колонки, на яку він посилається (для SERIAL — INTEGER).',
            })
        }

        // Правило 9: посилання на неунікальну колонку
        const toPkColumns = to.columns.filter((c) => c.primaryKey)
        const targetIsUnique = toCol.unique || (toCol.primaryKey && toPkColumns.length === 1)
        if (!targetIsUnique) {
            add({
                severity: 'error',
                tableId: from.id,
                message: `Зв'язок ${label}: колонка «${to.name}.${toCol.name}» не є унікальною`,
                hint: 'Зовнішній ключ може посилатися лише на первинний ключ або колонку з позначкою UNIQUE.',
            })
        }

        // Правило 10: ON DELETE SET NULL для обов'язкової колонки
        if (rel.onDelete === 'SET NULL' && (fromCol.notNull || fromCol.primaryKey)) {
            add({
                severity: 'error',
                tableId: from.id,
                message: `Зв'язок ${label}: дія ON DELETE SET NULL для колонки NOT NULL`,
                hint: 'Під час видалення батьківського рядка база не зможе записати NULL. Приберіть NOT NULL або оберіть іншу дію.',
            })
        }
    }

    // Правило 11: таблиця ні з чим не пов'язана
    if (project.tables.length > 1) {
        const connected = new Set<string>()
        for (const rel of project.relations) {
            connected.add(rel.fromTableId)
            connected.add(rel.toTableId)
        }
        for (const table of project.tables) {
            if (!connected.has(table.id)) {
                add({
                    severity: 'info',
                    tableId: table.id,
                    message: `Таблиця «${table.name}» не пов'язана з іншими`,
                    hint: 'Можливо, ви забули додати зовнішній ключ. Якщо таблиця справді незалежна — усе гаразд.',
                })
            }
        }
    }

    return issues
}

/** Скільки проблем кожного рівня. */
export function countBySeverity(issues: Issue[]): Record<Severity, number> {
    return {
        error: issues.filter((i) => i.severity === 'error').length,
        warning: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
    }
}