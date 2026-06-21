import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, IdentityTable } from "@/components/Shared";
import { Loading } from "@/components/ui/Misc";
import type { IdentityListItem, RiskBand } from "@/types";

const BANDS: (RiskBand | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function IdentityExplorer() {
  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [band, setBand] = useState<RiskBand | "ALL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .listIdentities({ risk_band: band === "ALL" ? undefined : band, limit: 200 })
      .then(setIdentities)
      .finally(() => setLoading(false));
  }, [band]);

  const filtered = identities.filter((i) =>
    i.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Identity DNA Explorer"
        subtitle="Every resolved identity, ranked by computed risk score. Click a row to open its full DNA profile."
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="px-3 py-2 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-identity)] w-64"
        />
        <div className="flex gap-1.5">
          {BANDS.map((b) => (
            <button
              key={b}
              onClick={() => setBand(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors border ${
                band === b
                  ? "bg-[var(--color-identity)] text-[#062420] border-[var(--color-identity)]"
                  : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-identity)]"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {filtered.length} identities
        </span>
      </div>

      {loading ? <Loading label="Resolving identities" /> : <IdentityTable identities={filtered} />}
    </div>
  );
}
