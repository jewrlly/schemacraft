import { describe, expect, it } from 'vitest'
import { exportProjectJson, importProjectJson, MAX_IMPORT_BYTES } from './importExport'
import { shopTemplate } from './templates'

describe('імпорт і експорт схеми', () => {
    it('експортований файл імпортується назад без втрат (з новим id)', () => {
        const original = shopTemplate('Магазин')
        const result = importProjectJson(exportProjectJson(original))
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.id).not.toBe(original.id)
        expect(result.project.tables).toEqual(original.tables)
        expect(result.project.relations).toEqual(original.relations)
    })

    it('відхиляє некоректний JSON', () => {
        expect(importProjectJson('{not json').ok).toBe(false)
    })

    it('відхиляє файли іншого формату', () => {
        expect(importProjectJson('{"hello":"world"}').ok).toBe(false)
    })

    it('відхиляє схему з невідомим типом даних', () => {
        const data = JSON.parse(exportProjectJson(shopTemplate('x')))
        data.project.tables[0].columns[0].type = 'INT; DROP TABLE users'
        expect(importProjectJson(JSON.stringify(data)).ok).toBe(false)
    })

    it('відкидає зайві поля (наприклад, спробу вставити скрипт)', () => {
        const data = JSON.parse(exportProjectJson(shopTemplate('x')))
        data.project.tables[0].onclick = '<script>alert(1)</script>'
        const result = importProjectJson(JSON.stringify(data))
        expect(result.ok).toBe(true)
        if (result.ok) expect('onclick' in result.project.tables[0]).toBe(false)
    })

    it('відкидає зв’язки з неіснуючими таблицями', () => {
        const data = JSON.parse(exportProjectJson(shopTemplate('x')))
        data.project.relations[0].toTableId = 'missing'
        const result = importProjectJson(JSON.stringify(data))
        expect(result.ok).toBe(true)
        if (result.ok) expect(result.project.relations).toHaveLength(2)
    })

    it('відхиляє завеликі файли', () => {
        expect(importProjectJson(' '.repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false)
    })
})