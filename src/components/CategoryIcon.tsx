import {
  Utensils, Car, ShoppingBag, ReceiptText, HeartPulse, Gamepad2, GraduationCap,
  House, Shapes, Coffee, Gift, Plane, Briefcase, Laptop, Store, TrendingUp,
  Coins, PiggyBank, ShieldAlert, Target, HeartHandshake, Banknote, Landmark,
  Percent, Sparkles, Building, Gem, Trophy, Shield, type LucideIcon
} from 'lucide-react'

export const categoryIcons: Record<string, LucideIcon> = {
  Utensils, Car, ShoppingBag, ReceiptText, HeartPulse, Gamepad2, GraduationCap,
  House, Shapes, Coffee, Gift, Plane, Briefcase, Laptop, Store, TrendingUp,
  Coins, PiggyBank, ShieldAlert, Target, HeartHandshake, Banknote, Landmark,
  Percent, Sparkles, Building, Gem, Trophy, Shield
}

export const categoryIconLabels: Record<string, string> = {
  Utensils: 'Makanan',
  Car: 'Kendaraan',
  ShoppingBag: 'Belanja',
  ReceiptText: 'Tagihan',
  HeartPulse: 'Kesehatan',
  Gamepad2: 'Hiburan',
  GraduationCap: 'Pendidikan',
  House: 'Rumah',
  Shapes: 'Lainnya',
  Coffee: 'Kopi',
  Gift: 'Hadiah',
  Plane: 'Perjalanan',
  Briefcase: 'Gaji / Kerja',
  Laptop: 'Freelance',
  Store: 'Usaha',
  TrendingUp: 'Investasi',
  Coins: 'Cashback / Koin',
  PiggyBank: 'Tabungan',
  ShieldAlert: 'Dana Darurat',
  Target: 'Target',
  HeartHandshake: 'Keluarga',
  Banknote: 'Uang Tunai',
  Landmark: 'Bank',
  Percent: 'Bunga',
  Sparkles: 'Bonus',
  Building: 'Properti',
  Gem: 'Aset',
  Trophy: 'Pencapaian',
  Shield: 'Proteksi'
}

const tones: Record<string, string> = {
  Utensils: 'amber',
  Car: 'blue',
  ShoppingBag: 'purple',
  ReceiptText: 'pink',
  HeartPulse: 'pink',
  Gamepad2: 'purple',
  GraduationCap: 'blue',
  House: 'green',
  Shapes: 'gray',
  Coffee: 'amber',
  Gift: 'pink',
  Plane: 'blue',
  Briefcase: 'green',
  Laptop: 'blue',
  Store: 'amber',
  TrendingUp: 'green',
  Coins: 'amber',
  PiggyBank: 'pink',
  ShieldAlert: 'amber',
  Target: 'purple',
  HeartHandshake: 'pink',
  Banknote: 'green',
  Landmark: 'blue',
  Percent: 'green',
  Sparkles: 'amber',
  Building: 'blue',
  Gem: 'purple',
  Trophy: 'amber',
  Shield: 'blue'
}

export function CategoryIcon({ icon, size = 21, toneOverride }: { icon: string; size?: number; toneOverride?: string }) {
  const Icon = categoryIcons[icon] || Shapes
  const tone = toneOverride || tones[icon] || 'gray'
  return (
    <span className={`category-icon ${tone}`}>
      <Icon size={size} strokeWidth={1.8} />
    </span>
  )
}
