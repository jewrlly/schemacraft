import { describe, expect, it } from 'vitest'
import { safeFileName } from './download'

describe('safeFileName — безпечна назва файлу', () => {
    it('транслітерує кирилицю латиницею', () => {
        expect(safeFileName('Інтернет-магазин')).toBe('Internet-mahazyn')
    })

    it('не дає вийти за межі папки', () => {
        expect(safeFileName('../../etc/passwd')).not.toContain('/')
        expect(safeFileName('../../etc/passwd')).not.toContain('..')
    })

    it('для порожньої назви повертає непорожню назву', () => {
        expect(safeFileName('   ').length).toBeGreaterThan(0)
    })
})