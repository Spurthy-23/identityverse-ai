import { NavLink } from "react-router-dom";
import {
  Home,
  Dna,
  Share2,
  Bomb,
  Radar,
  UserX,
  Clock,
  TrendingUp,
  MessageSquareText,
  Wrench,
  FileText,
  ShieldHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Command Center", icon: Home },
  { to: "/identities", label: "Identity DNA", icon: Dna },
  { to: "/graph", label: "Attack Paths", icon: Share2 },
  { to: "/breach-simulator", label: "Breach Simulator", icon: Bomb },
  { to: "/threat-radar", label: "Threat Radar", icon: Radar },
  { to: "/orphans", label: "Orphan Accounts", icon: UserX },
  { to: "/dormant-admins", label: "Dormant Admins", icon: Clock },
  { to: "/forecast", label: "Forecast Engine", icon: TrendingUp },
  { to: "/copilot", label: "Security Copilot", icon: MessageSquareText },
  { to: "/remediation", label: "Action Center", icon: Wrench },
  { to: "/reports", label: "Executive Reports", icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-[var(--color-border-soft)] bg-[var(--color-base)]/80 backdrop-blur-md flex flex-col z-10">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="relative">
          <ShieldHalf size={22} className="text-[var(--color-identity)] relative z-10" strokeWidth={2.2} />
          <div className="absolute inset-0 blur-md bg-[var(--color-identity)] opacity-50" />
        </div>
        <div>
          <div className="font-display font-bold text-[15px] leading-none text-[var(--color-text-primary)] text-glow-identity">
            AccessDNA <span className="text-[var(--color-ai)]">AI</span>
          </div>
          <div className="text-[9px] tracking-[0.18em] text-[var(--color-text-muted)] font-mono mt-1.5 uppercase">
            Predictive Identity Attack Intelligence
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative overflow-hidden",
                isActive
                  ? "bg-[var(--color-elevated)] text-[var(--color-text-primary)] ring-glow-identity"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--color-identity)]" />
                )}
                <Icon
                  size={17}
                  strokeWidth={2}
                  className={isActive ? "text-[var(--color-identity)]" : "opacity-70 group-hover:opacity-100"}
                />
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--color-border-soft)] flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-risk-low)]" />
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
          live · synthetic dataset
        </span>
      </div>
    </aside>
  );
}
