import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, Network, Bomb, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Misc";
import { DnaHelix, computeDnaGenes } from "@/components/DnaHelix";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { RevocationSimulator } from "@/components/RevocationSimulator";
import { computeEvidenceTimeline, type EvidenceEntry } from "@/lib/evidenceTimeline";
import type { IdentityDetail, RemediationResponse, BlastRadiusResponse } from "@/types";

export default function IdentityProfile() {
  const { id } = useParams<{ id: string }>();
  const [identity, setIdentity] = useState<IdentityDetail | null>(null);
  const [remediation, setRemediation] = useState<RemediationResponse | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResponse | null>(null);
  const [remediationLoading, setRemediationLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIdentity(null);
    setEvidence(null);
    setError(false);

    api
      .getIdentity(id)
      .then((full) => {
        setIdentity(full);
        // Evidence is a nice-to-have on top of the core profile -- if the
        // timeline fetch fails, still show evidence built from current
        // state alone rather than blocking the whole page.
        api
          .getTimeline(id)
          .then((t) => setEvidence(computeEvidenceTimeline(full, t.events)))
          .catch(() => setEvidence(computeEvidenceTimeline(full, [])));
      })
      .catch(() => setError(true));

    api.getBlastRadius(id).then(setBlastRadius).catch(() => setBlastRadius(null));
  }, [id]);

  const loadRemediation = () => {
    if (!id) return;
    setRemediationLoading(true);
    api.getRemediation(id).then(setRemediation).finally(() => setRemediationLoading(false));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Couldn't load this identity. Confirm uvicorn is still running on port 8000.
        </p>
        <Link to="/identities" className="text-sm text-[var(--color-identity)] hover:underline">
          ← Back to Identity Explorer
        </Link>
      </div>
    );
  }

  if (!identity) return <Loading label="Loading identity profile" />;

  const genes = computeDnaGenes(identity);
  const platformsTouched = [...new Set(identity.platform_accounts.map((a) => a.platform))];

  return (
    <div>
      <Link
        to="/identities"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Identity Explorer
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {identity.full_name}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {identity.department} · Manager: {identity.manager ?? "Unassigned (service account)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge band={identity.risk_band} />
          <span className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)]">
            {identity.final_risk_score.toFixed(0)}
            <span className="text-sm text-[var(--color-text-muted)]">/100</span>
          </span>
        </div>
      </div>

      <Card glow="identity" className="mb-6">
        <CardHeader
          title="Identity DNA"
          subtitle="Composite risk genes derived from this identity's cross-platform footprint"
        />
        <DnaHelix genes={genes} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Audit Evidence Explorer"
              subtitle="Every point in this risk score, traced to a specific event or condition"
            />
            {evidence ? (
              <EvidenceTimeline entries={evidence} />
            ) : (
              <Loading label="Assembling evidence ledger" />
            )}
            <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex items-center gap-4 text-xs text-[var(--color-text-muted)] font-mono">
              <span>Anomaly score: {identity.anomaly_score.toFixed(1)}</span>
              <span>Resolution confidence: {identity.resolution_confidence.toFixed(0)}%</span>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Shadow Identity Merge" subtitle="Usernames resolved into this identity" />
          <div className="space-y-2">
            {identity.merged_usernames.map((u) => (
              <div
                key={u}
                className="text-xs font-mono px-2.5 py-1.5 rounded bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
              >
                {u}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <RevocationSimulator identity={identity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card>
          <CardHeader
            title="AI CISO Recommendation"
            subtitle="Groq-generated remediation (falls back to rule-based guidance if unavailable)"
            action={
              <Button variant="secondary" onClick={loadRemediation} disabled={remediationLoading}>
                <Sparkles size={14} />
                {remediationLoading ? "Analyzing..." : remediation ? "Regenerate" : "Generate"}
              </Button>
            }
          />
          {!remediation && !remediationLoading && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Click "Generate" to get an AI-written risk summary and remediation plan for this identity.
            </p>
          )}
          {remediationLoading && <Loading label="Consulting AI CISO" />}
          {remediation && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{remediation.summary}</p>
              <div>
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-medium">
                  Business Impact
                </span>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{remediation.business_impact}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-medium">
                  Remediation Steps
                </span>
                <ol className="mt-2 space-y-1.5">
                  {remediation.remediation_steps.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--color-text-primary)] flex gap-2.5">
                      <span className="font-mono text-[var(--color-ai)] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] inline-block px-2 py-0.5 rounded bg-[var(--color-elevated)]">
                source: {remediation.source}
              </span>
            </div>
          )}
        </Card>

        <Card glow="ai">
          <CardHeader title="Blast Radius" subtitle="Impact if this identity is compromised" />
          {blastRadius ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Systems Impacted</span>
                <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)]">
                  {blastRadius.systems_impacted}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Critical Resources</span>
                <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)]">
                  {blastRadius.critical_resources}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Customer Data</span>
                <div className="text-sm font-semibold mt-1" style={{ color: blastRadius.customer_data_exposed ? "#FB4768" : "#34D399" }}>
                  {blastRadius.customer_data_exposed ? "EXPOSED" : "Not exposed"}
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Impact Level</span>
                <div className="mt-1">
                  <RiskBadge band={blastRadius.impact_level} />
                </div>
              </div>
              <Link
                to="/blast-radius"
                state={{ identityId: id }}
                className="col-span-2 mt-2 text-xs text-[var(--color-identity)] hover:underline flex items-center gap-1.5"
              >
                <Bomb size={13} /> View full blast radius map
              </Link>
            </div>
          ) : (
            <Loading label="Calculating blast radius" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Platform Accounts"
          subtitle={`Resolved from ${platformsTouched.length} platform${platformsTouched.length !== 1 ? "s" : ""}`}
          action={
            <Link
              to="/graph"
              state={{ identityId: id }}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-identity)] hover:underline"
            >
              <Network size={13} /> View identity graph
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wide border-b border-[var(--color-border-soft)]">
                <th className="py-2 pr-4">Platform</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Last Login</th>
                <th className="py-2 pr-4">Token Age</th>
              </tr>
            </thead>
            <tbody>
              {identity.platform_accounts.map((a) => (
                <tr key={a.snapshot_id} className="border-b border-[var(--color-border-soft)] last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs">{a.platform}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-[var(--color-text-secondary)]">{a.username}</td>
                  <td className="py-2.5 pr-4">{a.role}</td>
                  <td className="py-2.5 pr-4">
                    <span style={{ color: a.status === "Active" ? "#34D399" : "#FB4768" }}>{a.status}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                    {new Date(a.last_login).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-[var(--color-text-secondary)]">
                    {a.token_age_days}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
