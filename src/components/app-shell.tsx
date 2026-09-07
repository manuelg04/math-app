"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserRound, LogOut, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { authClient } from "@/lib/auth-client";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="eyebrow nav-label">MI APRENDIZAJE</span>
        <nav>
          <Link
            aria-current={path === "/dashboard" ? "page" : undefined}
            href="/dashboard"
          >
            <LayoutDashboard size={19} />
            Mi recorrido
          </Link>
          <Link
            aria-current={path.includes("perfil") ? "page" : undefined}
            href="/dashboard/perfil"
          >
            <UserRound size={19} />
            Mi perfil
          </Link>
        </nav>
        <div className="sidebar-note">
          <span>
            Un poco de práctica.
            <br />
            <em>Un gran avance.</em>
          </span>
          <ArrowUpRight size={23} />
        </div>
        <button
          className="sign-out"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
