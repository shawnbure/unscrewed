import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const max = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
  }[size];
  return (
    <div className={`mx-auto w-full ${max} px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
