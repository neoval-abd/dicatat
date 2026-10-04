import type { CategoryTotal } from '../types'
import { formatRupiah } from '../utils/format'
import { CategoryIcon } from './CategoryIcon'
export function CategoryBreakdown({ categories, total, limit }: { categories: CategoryTotal[]; total: number; limit?: number }) {
  return <div className="category-breakdown">{categories.slice(0, limit).map(category => {
    const percent = total ? category.total / total * 100 : 0
    return <div className="breakdown-row" key={category.id}><CategoryIcon icon={category.icon} size={19} />
      <div className="breakdown-copy"><div><strong>{category.name}</strong><b>{formatRupiah(category.total)}</b></div>
        <div className="bar-track" role="img" aria-label={`${category.name}: ${percent.toFixed(1)} persen`}><span style={{ width: `${percent}%` }} /></div>
        <small>{category.count} transaksi <span>{Math.round(percent)}%</span></small>
      </div>
    </div>
  })}</div>
}
