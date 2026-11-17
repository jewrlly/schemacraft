/** Завантажує текст як файл на комп'ютер користувача. */
export function downloadFile(filename: string, content: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Транслітерація за постановою КМУ № 55 від 27.01.2010 (спрощено: без особливих правил для початку слова)
const TRANSLIT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i',
    й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
    ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '',
}

/**
 * Робить з назви проєкту безпечну назву файлу: кирилиця транслітерується латиницею
 * (деякі браузери ігнорують назви з нелатинськими символами), решта недопустимих символів замінюється на «_».
 */
export function safeFileName(name: string): string {
    const latin = [...name.trim()]
        .map((ch) => {
            const lower = ch.toLowerCase()
            if (!(lower in TRANSLIT)) return ch
            const t = TRANSLIT[lower]
            return ch !== lower && t ? t[0].toUpperCase() + t.slice(1) : t
        })
        .join('')
    return latin.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'schema'
}

/** Копіює текст у буфер обміну; для старих браузерів — запасний спосіб через тимчасове поле. */
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        /* переходимо до запасного способу */
    }
    try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
    } catch {
        return false
    }
}