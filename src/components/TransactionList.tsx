import { Image } from 'lucide-react'
import type { Transaction } from '../types'
import { formatRupiah } from '../utils/format'
import { dateLabel } from '../utils/date'
import { CategoryIcon } from './CategoryIcon'

export function TransactionList({
  items,
  onSelect,
  grouped = false
}: {
  items: Transaction[]
  onSelect: (item: Transaction) => void
  grouped?: boolean
}) {
  return (
    <div className="transaction-list">
      {items.map((item, index) => {
        const isIncome = item.type === 'income'
        const subtitle = isIncome
          ? item.source
            ? `${item.source} · ${item.category.name}`
            : item.category.name
          : item.category.name

        return (
          <div key={item.id}>
            {grouped && (index === 0 || items[index - 1].transaction_date !== item.transaction_date) && (
              <h3 className="date-label">{dateLabel(item.transaction_date)}</h3>
            )}
            <button className={`transaction-row ${isIncome ? 'income-row' : ''}`} onClick={() => onSelect(item)}>
              <CategoryIcon icon={item.category.icon} />
              <span className="transaction-copy">
                <strong>{item.note || item.source || item.category.name}</strong>
                <small>
                  {subtitle}
                  {item.receipt_path && <Image size={12} aria-label="Memiliki foto bukti" />}
                </small>
              </span>
              <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
                <strong>
                  {isIncome ? '+' : '-'}
                  {formatRupiah(item.amount)}
                </strong>
                <small>{grouped ? item.transaction_time.slice(0, 5) : dateLabel(item.transaction_date)}</small>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
