import {
  Beer,
  Bike,
  Coffee,
  Compass,
  Film,
  Gamepad2,
  Gift,
  Heart,
  House,
  Mountain,
  Music,
  Plane,
  Sparkles,
  Tent,
  Ticket,
  Utensils,
  Wallet,
  Wine,
  type LucideIcon,
} from 'lucide-react'

export const WHEEL_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  compass: Compass,
  coffee: Coffee,
  house: House,
  mountain: Mountain,
  wallet: Wallet,
  sparkles: Sparkles,
  film: Film,
  heart: Heart,
  music: Music,
  plane: Plane,
  gamepad: Gamepad2,
  gift: Gift,
  beer: Beer,
  wine: Wine,
  ticket: Ticket,
  tent: Tent,
  bike: Bike,
}

export function WheelIcon({ name, size = 16 }: { name: string; size?: number }) {
  const I = WHEEL_ICONS[name] ?? Sparkles
  return <I size={size} strokeWidth={1.75} />
}
