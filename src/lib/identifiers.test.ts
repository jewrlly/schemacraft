import { describe, expect, it } from 'vitest'
import { formatDefault, isReservedWord, nextFreeName, quoteIdent, safeComment, validateName } from './identifiers'

describe('validateName — перевірка назв таблиць і колонок', () => {
    it('приймає коректні назви', () => {
        expect(validateName('users')).toBeNull()
        expect(validateName('order_items')).toBeNull()
        expect(validateName('_tmp1')).toBeNull()
    })

    it('відхиляє порожню назву', () => {
        expect(validateName('   ')).not.toBeNull()
    })

    it('відхиляє назви з пробілами, кирилицею та спецсимволами', () => {
        expect(validateName('my table')).not.toBeNull()
        expect(validateName('таблиця')).not.toBeNull()
        expect(validateName('users;DROP')).not.toBeNull()
        expect(validateName('1users')).not.toBeNull()
    })

    it('відхиляє занадто довгі назви', () => {
        expect(validateName('a'.repeat(64))).not.toBeNull()
        expect(validateName('a'.repeat(63))).toBeNull()
    })

    it('відхиляє дублікати без урахування регістру', () => {
        expect(validateName('Users', ['users'])).not.toBeNull()
    })
})

describe('екранування для SQL', () => {
    it('quoteIdent подвоює подвійні лапки', () => {
        expect(quoteIdent('users')).toBe('"users"')
        expect(quoteIdent('a"b')).toBe('"a""b"')
    })

    it('formatDefault пропускає числа та безпечні ключові слова', () => {
        expect(formatDefault('42')).toBe('42')
        expect(formatDefault('-3.5')).toBe('-3.5')
        expect(formatDefault('current_timestamp')).toBe('CURRENT_TIMESTAMP')
        expect(formatDefault('true')).toBe('TRUE')
        expect(formatDefault('')).toBeNull()
    })

    it('formatDefault перетворює інший текст на безпечний рядковий літерал', () => {
        expect(formatDefault('new')).toBe("'new'")
    })

    it('formatDefault не дозволяє SQL-ін’єкцію', () => {
        const attack = "x'); DROP TABLE users; --"
        expect(formatDefault(attack)).toBe("'x''); DROP TABLE users; --'")
    })

    it('safeComment прибирає переноси рядків', () => {
        expect(safeComment('Магазин\nDROP TABLE users;')).toBe('Магазин DROP TABLE users;')
    })
})

describe('допоміжні функції', () => {
    it('isReservedWord розпізнає зарезервовані слова', () => {
        expect(isReservedWord('USER')).toBe(true)
        expect(isReservedWord('customers')).toBe(false)
    })

    it('nextFreeName пропонує перше вільне ім’я', () => {
        expect(nextFreeName('table', [])).toBe('table_1')
        expect(nextFreeName('table', ['table_1', 'TABLE_2'])).toBe('table_3')
    })
})