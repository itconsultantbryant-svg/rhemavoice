"use client";

import {
  BookOpen,
  Briefcase,
  Car,
  Church,
  GraduationCap,
  LayoutGrid,
  Mic,
  Plane,
  Radio,
  Target,
  Ticket,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  church: Church,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  radio: Radio,
  briefcase: Briefcase,
  mic: Mic,
  target: Target,
  car: Car,
  ticket: Ticket,
  plane: Plane,
};

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutGrid;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
