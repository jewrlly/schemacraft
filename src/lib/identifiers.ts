/** Пропонує вільне ім'я вигляду base_1, base_2 ... */
export function nextFreeName(base: string, existing: string[]): string {
    const lower = new Set(existing.map((n) => n.toLowerCase()))
    for (let i = 1; ; i++) {
        const candidate = `${base}_${i}`
        if (!lower.has(candidate)) return candidate
    }
}