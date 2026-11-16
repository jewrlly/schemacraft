import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
    id: number
    kind: ToastKind
    text: string
}

interface ToastState {
    toasts: Toast[]
    show: (text: string, kind?: ToastKind) => void
    dismiss: (id: number) => void
}

let counter = 0

export const useToastStore = create<ToastState>()((set, get) => ({
    toasts: [],
    show: (text, kind = 'success') => {
        const id = ++counter
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, text }] }))
        window.setTimeout(() => get().dismiss(id), 3500)
    },
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Показати сповіщення з будь-якого місця коду: toast('Збережено'). */
export const toast = (text: string, kind?: ToastKind) => useToastStore.getState().show(text, kind)