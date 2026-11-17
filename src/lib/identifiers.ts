// Перевірка імен таблиць і колонок, що потрапляють у SQL.

export const MAX_NAME_LENGTH = 63 // обмеження PostgreSQL на довжину назви
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Слова, які PostgreSQL резервує. Їх можна використовувати лише в лапках, тому застосунок попереджає про них. */
export const RESERVED_WORDS = new Set([
    'all', 'and', 'any', 'as', 'asc', 'between', 'by', 'case', 'check', 'column', 'constraint',
    'create', 'default', 'delete', 'desc', 'distinct', 'drop', 'else', 'end', 'exists', 'false',
    'foreign', 'from', 'grant', 'group', 'having', 'in', 'index', 'insert', 'into', 'is', 'join',
    'key', 'like', 'limit', 'not', 'null', 'offset', 'on', 'or', 'order', 'primary', 'references',
    'select', 'table', 'then', 'to', 'true', 'union', 'unique', 'update', 'user', 'using', 'values',
    'when', 'where', 'with',
])

/**
 * Перевіряє назву таблиці чи колонки.
 * Повертає текст помилки українською або null, якщо назва коректна.
 */
export function validateName(name: string, otherNames: string[] = []): string | null {
    const trimmed = name.trim()
    if (trimmed.length === 0) return 'Назва не може бути порожньою'
    if (trimmed.length > MAX_NAME_LENGTH) return `Назва довша за ${MAX_NAME_LENGTH} символи`
    if (!NAME_RE.test(trimmed)) {
        return 'Лише латинські літери, цифри та «_», першим символом не може бути цифра'
    }
    const lower = trimmed.toLowerCase()
    if (otherNames.some((n) => n.toLowerCase() === lower)) return 'Така назва вже існує'
    return null
}

/** Чи є назва зарезервованим словом SQL (наприклад, user, order). */
export function isReservedWord(name: string): boolean {
    return RESERVED_WORDS.has(name.toLowerCase())
}

/** Пропонує вільне ім'я вигляду base_1, base_2 ... */
export function nextFreeName(base: string, existing: string[]): string {
    const lower = new Set(existing.map((n) => n.toLowerCase()))
    for (let i = 1; ; i++) {
        const candidate = `${base}_${i}`
        if (!lower.has(candidate)) return candidate
    }
}

/** Екранує назву для SQL: обгортає в подвійні лапки і подвоює лапки всередині. */
export function quoteIdent(name: string): string {
    return '"' + name.replace(/"/g, '""') + '"'
}

/** Екранує текстове значення: обгортає в одинарні лапки і подвоює одинарні лапки всередині. */
export function quoteLiteral(value: string): string {
    return "'" + value.replace(/'/g, "''") + "'"
}

const SAFE_DEFAULT_KEYWORDS = new Set([
    'NULL', 'TRUE', 'FALSE', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'NOW()', 'GEN_RANDOM_UUID()',
])
const NUMBER_RE = /^-?\d+(\.\d+)?$/

/**
 * Перетворює значення за замовчуванням на безпечний фрагмент SQL.
 * Дозволені лише числа і кілька ключових слів; усе інше стає текстовим значенням у лапках,
 * тому вставити в згенерований скрипт довільну SQL-команду неможливо.
 */
export function formatDefault(raw: string): string | null {
    const value = raw.trim()
    if (value === '') return null
    if (NUMBER_RE.test(value)) return value
    if (SAFE_DEFAULT_KEYWORDS.has(value.toUpperCase())) return value.toUpperCase()
    const unquoted =
        value.length >= 2 && value.startsWith("'") && value.endsWith("'") ? value.slice(1, -1) : value
    return quoteLiteral(unquoted)
}

/** Прибирає з тексту переноси рядка, щоб його можна було безпечно вставити в SQL-коментар. */
export function safeComment(text: string): string {
    return text.replace(/[\r\n]+/g, ' ').slice(0, 200)
}