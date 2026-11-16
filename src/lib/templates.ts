import type { Column, Project, Relation, SqlType, Table, TableColor } from '../types'

/** Короткий опис колонки: назва, тип, позначки ('pk nn uq'), значення за замовчуванням. */
type ColSpec = [name: string, type: SqlType, flags?: string, defaultValue?: string]

function col([name, type, flags = '', defaultValue = '']: ColSpec): Column {
    return {
        id: crypto.randomUUID(),
        name,
        type,
        primaryKey: flags.includes('pk'),
        notNull: flags.includes('nn'),
        unique: flags.includes('uq'),
        defaultValue,
    }
}

function table(name: string, color: TableColor, x: number, y: number, cols: ColSpec[]): Table {
    return { id: crypto.randomUUID(), name, color, position: { x, y }, columns: cols.map(col) }
}

function rel(from: Table, fromCol: string, to: Table, toCol: string, onDelete: Relation['onDelete']): Relation {
    return {
        id: crypto.randomUUID(),
        fromTableId: from.id,
        fromColumnId: from.columns.find((c) => c.name === fromCol)!.id,
        toTableId: to.id,
        toColumnId: to.columns.find((c) => c.name === toCol)!.id,
        onDelete,
    }
}

/** Приклад схеми «Інтернет-магазин», щоб користувач одразу побачив, як працює застосунок. */
export function shopTemplate(name: string): Project {
    const customers = table('customers', 'indigo', 40, 40, [
        ['id', 'SERIAL', 'pk'],
        ['email', 'VARCHAR(255)', 'nn uq'],
        ['full_name', 'VARCHAR(255)', 'nn'],
        ['created_at', 'TIMESTAMP', 'nn', 'CURRENT_TIMESTAMP'],
    ])
    const products = table('products', 'emerald', 40, 300, [
        ['id', 'SERIAL', 'pk'],
        ['title', 'VARCHAR(255)', 'nn'],
        ['price', 'NUMERIC(10,2)', 'nn'],
        ['in_stock', 'BOOLEAN', 'nn', 'TRUE'],
    ])
    const orders = table('orders', 'amber', 380, 40, [
        ['id', 'SERIAL', 'pk'],
        ['customer_id', 'INTEGER', 'nn'],
        ['status', 'VARCHAR(255)', 'nn', 'new'],
        ['created_at', 'TIMESTAMP', 'nn', 'CURRENT_TIMESTAMP'],
    ])
    const items = table('order_items', 'rose', 720, 200, [
        ['id', 'SERIAL', 'pk'],
        ['order_id', 'INTEGER', 'nn'],
        ['product_id', 'INTEGER', 'nn'],
        ['quantity', 'INTEGER', 'nn', '1'],
    ])

    const now = Date.now()
    return {
        id: crypto.randomUUID(),
        name,
        createdAt: now,
        updatedAt: now,
        tables: [customers, products, orders, items],
        relations: [
            rel(orders, 'customer_id', customers, 'id', 'RESTRICT'),
            rel(items, 'order_id', orders, 'id', 'CASCADE'),
            rel(items, 'product_id', products, 'id', 'RESTRICT'),
        ],
    }
}