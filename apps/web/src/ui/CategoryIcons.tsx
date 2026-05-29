import {
  Smartphone,
  Wrench,
  Car,
  Home,
  Shirt,
  Baby,
  Mountain,
  Music,
  BookOpen,
  HardHat,
  Briefcase,
  Hammer,
  GraduationCap,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Smartphone,
  tools: Wrench,
  vehicles: Car,
  home_garden: Home,
  clothing: Shirt,
  kids_baby: Baby,
  sports_outdoors: Mountain,
  music_instruments: Music,
  books_media: BookOpen,
  labor: HardHat,
  professional_services: Briefcase,
  skilled_trades: Hammer,
  tutoring: GraduationCap,
  creative: Palette,
  other: Sparkles,
};

export function CategoryIcon({
  slug,
  className = "h-5 w-5",
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Sparkles;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
