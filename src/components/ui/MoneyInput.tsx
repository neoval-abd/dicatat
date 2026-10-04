import { formatAmountInput } from '../../utils/format'
export function MoneyInput({ value, onChange, id = 'amount', disabled, large = false }: {
  value: string; onChange: (value: string) => void; id?: string; disabled?: boolean; large?: boolean
}) {
  return <div className={`money-input ${large ? 'large' : ''}`}><span>Rp</span><input id={id} type="text" inputMode="numeric" pattern="[0-9.]*" autoComplete="off" required
    value={value} maxLength={21} placeholder="0" disabled={disabled} onChange={e => onChange(formatAmountInput(e.target.value))} /></div>
}
