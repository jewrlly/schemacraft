import type { SqlType } from '../types'

/** Тип, яким має бути колонка-посилання на колонку цього типу (SERIAL → INTEGER тощо). */
export function referenceType(type: SqlType): SqlType {
    if (type === 'SERIAL') return 'INTEGER'
    if (type === 'BIGSERIAL') return 'BIGINT'
    return type
}

/** Чи сумісні типи зовнішнього ключа та колонки, на яку він посилається. */
export function areTypesCompatible(fkType: SqlType, targetType: SqlType): boolean {
    return referenceType(fkType) === referenceType(targetType)
}