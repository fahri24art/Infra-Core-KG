import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={twMerge(clsx("bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none", className))}
      {...props}
    >
      {children}
    </div>
  );
}
