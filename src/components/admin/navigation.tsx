"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
export function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const active =
    path === href || (href !== "/admin" && path.startsWith(href + "/"));
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
export function AdminMobileMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} className="admin-mobile-nav">
      <summary>
        Menu <span>＋</span>
      </summary>
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a") && ref.current)
            ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
