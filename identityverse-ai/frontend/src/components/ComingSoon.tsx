import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/Shared";

export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-deep rounded-xl p-16 flex flex-col items-center text-center"
      >
        <div className="relative mb-5">
          <Icon size={36} className="text-[var(--color-ai)] relative z-10" strokeWidth={1.5} />
          <div className="absolute inset-0 blur-xl bg-[var(--color-ai)] opacity-30" />
        </div>
        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Module Initializing
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">{detail}</p>
        <div className="mt-6 w-48 h-1 rounded-full bg-[var(--color-elevated)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--color-identity)] to-[var(--color-ai)]"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
