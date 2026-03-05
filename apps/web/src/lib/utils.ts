import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const severityColor = (severity: string): string => {
  switch (severity) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-amber-400 text-black";
    default:
      return "bg-sky-400 text-black";
  }
};

export const complexityColor = (value: number): string => {
  if (value <= 5) {
    return "#22c55e";
  }
  if (value <= 10) {
    return "#eab308";
  }
  if (value <= 15) {
    return "#f97316";
  }
  return "#ef4444";
};
