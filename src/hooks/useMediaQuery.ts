import { useSyncExternalStore } from 'react'

/** Повертає true, якщо екран відповідає медіазапиту (наприклад, '(max-width: 767px)'). */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const mq = window.matchMedia(query)
            mq.addEventListener('change', onChange)
            return () => mq.removeEventListener('change', onChange)
        },
        () => window.matchMedia(query).matches,
        () => false,
    )
}