import { create } from 'zustand'

interface ConfirmOptions {
    title: string
    text: string
    confirmLabel?: string
}

interface ConfirmState {
    options: ConfirmOptions | null
    resolve: ((value: boolean) => void) | null
    ask: (options: ConfirmOptions) => Promise<boolean>
    close: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
    options: null,
    resolve: null,
    ask: (options) =>
        new Promise<boolean>((resolve) => {
            set({ options, resolve })
        }),
    close: (value) => {
        get().resolve?.(value)
        set({ options: null, resolve: null })
    },
}))

/** Запитує підтвердження небезпечної дії (наприклад, видалення). Повертає true, якщо користувач погодився. */
export const confirmAction = (options: ConfirmOptions) => useConfirmStore.getState().ask(options)