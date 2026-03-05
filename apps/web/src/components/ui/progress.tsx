import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress = ({ value, className }: ProgressProps): JSX.Element => (
  <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
    <div
      className="h-full bg-primary transition-all duration-300 ease-out"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);
