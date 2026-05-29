import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-7 sm:p-8">
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-4 text-center text-sm text-ink-500">{footer}</p>
        )}
      </div>
    </div>
  );
}
