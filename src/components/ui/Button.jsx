import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Button({ className, variant = "primary", size = "m", children, ...props }) {
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm",
        ghost: "text-gray-600 hover:bg-gray-100",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm"
    };

    const sizes = {
        s: "px-3 py-1.5 text-sm",
        m: "px-4 py-2 text-sm",
        l: "px-6 py-3 text-base"
    };

    return (
        <button
            className={twMerge(clsx("rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]", variants[variant], sizes[size], className))}
            {...props}
        >
            {children}
        </button>
    );
}
