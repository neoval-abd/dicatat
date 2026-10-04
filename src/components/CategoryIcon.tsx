import { Utensils, Car, ShoppingBag, ReceiptText, HeartPulse, Gamepad2, GraduationCap, House, Shapes, Coffee, Gift, Plane, type LucideIcon } from 'lucide-react'
export const categoryIcons: Record<string, LucideIcon> = { Utensils, Car, ShoppingBag, ReceiptText, HeartPulse, Gamepad2, GraduationCap, House, Shapes, Coffee, Gift, Plane }
export const categoryIconLabels: Record<string, string> = { Utensils: 'Makanan', Car: 'Kendaraan', ShoppingBag: 'Belanja', ReceiptText: 'Tagihan', HeartPulse: 'Kesehatan', Gamepad2: 'Hiburan', GraduationCap: 'Pendidikan', House: 'Rumah', Shapes: 'Lainnya', Coffee: 'Kopi', Gift: 'Hadiah', Plane: 'Perjalanan' }
const tones: Record<string, string> = { Utensils: 'amber', Car: 'blue', ShoppingBag: 'purple', ReceiptText: 'pink', HeartPulse: 'pink', Gamepad2: 'purple', GraduationCap: 'blue', House: 'green', Shapes: 'gray', Coffee: 'amber', Gift: 'pink', Plane: 'blue' }
export function CategoryIcon({ icon, size = 21 }: { icon: string; size?: number }) {
  const Icon = categoryIcons[icon] || Shapes
  return <span className={`category-icon ${tones[icon] || 'gray'}`}><Icon size={size} strokeWidth={1.8} /></span>
}
