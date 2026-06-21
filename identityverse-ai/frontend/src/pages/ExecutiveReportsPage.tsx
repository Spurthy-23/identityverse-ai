import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer, AlertTriangle, RotateCw, ChevronLeft, ChevronRight, Presentation,
} from "lucide-react";
import { loadReportData, rootCauseFor, getComplianceMap, type ExecutiveReportData } from "@/lib/executiveReports";
import { PageHeader } from "@/components/Shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Loading } from "@/components/ui/Misc";

type ReportType = "incident" | "executive" | "audit" | "board";

const REPORT_TYPES: { key: ReportType; label: string }[] = [
  { key: "incident", label: "Incident Report" },
  { key: "executive", label: "Executive Summary" },
  { key: "audit", label: "Audit Report" },
  { key: "board", label: "Board Presentation" },
];

export default function ExecutiveReportsPage() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [storyMode, setStoryMode] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    loadReportData().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loading label="Compiling risk evidence" />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <AlertTriangle size={28} className="text-[var(--color-risk-high)] mb-3" />
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Couldn't reach the backend. Confirm uvicorn is still running on port 8000.
        </p>
        <Button variant="secondary" onClick={load}><RotateCw size={14} /> Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  if (storyMode) {
    return <StoryMode data={data} onExit={() => setStoryMode(false)} />;
  }

  return (
    <div>
      <PageHeader
        title="Executive Reports"
        subtitle="Generated from current risk data — incident reports, executive summaries, audit views, and board-ready presentations."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStoryMode(true)}>
              <Presentation size={14} /> Story Mode
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={14} /> Print / Save as PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-6">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => setReportType(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors border ${
              reportType === r.key
                ? "bg-[var(--color-identity)] text-[#062420] border-[var(--color-identity)]"
                : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-identity)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div id="report-print-area">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">AccessDNA AI — {REPORT_TYPES.find((r) => r.key === reportType)?.label}</h1>
          <p className="text-sm">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>

        <AnimatePresence mode="wait">
          {reportType === "executive" && <ExecutiveSummary key="exec" data={data} />}
          {reportType === "incident" && <IncidentReport key="inc" data={data} />}
          {reportType === "audit" && <AuditReport key="audit" data={data} />}
          {reportType === "board" && <BoardPresentation key="board" data={data} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ExecutiveSummary({ data }: { data: ExecutiveReportData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card>
        <CardHeader title="Summary" />
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          As of this report, the environment contains <strong className="print-accent text-[var(--color-text-primary)]">{data.totalIdentities}</strong> resolved
          identities across AD, AWS, Okta, and Salesforce. <strong className="print-critical text-[var(--color-risk-critical)]">{data.highRiskCount}</strong> are
          classified HIGH or CRITICAL risk. The most significant structural finding is{" "}
          <strong className="text-[var(--color-text-primary)]">{data.orphanCount} orphan accounts</strong> — identities disabled in Active Directory but still
          active on at least one other platform — alongside <strong className="text-[var(--color-text-primary)]">{data.dormantAdminCount} dormant admin accounts</strong> holding
          standing privileged access with no recent login. <strong className="text-[var(--color-text-primary)]">{data.crossPlatformAdminCount}</strong> identities
          hold administrative roles on two or more platforms simultaneously.
          {data.mostDangerousDepartment && (
            <> The <strong className="text-[var(--color-text-primary)]">{data.mostDangerousDepartment.department}</strong> department carries the highest average
            risk score ({data.mostDangerousDepartment.avg_risk_score.toFixed(0)}/100) and should be prioritized for review.</>
          )}
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Identities", value: data.totalIdentities },
          { label: "High/Critical Risk", value: data.highRiskCount },
          { label: "Orphan Accounts", value: data.orphanCount },
          { label: "Dormant Admins", value: data.dormantAdminCount },
        ].map((s) => (
          <Card key={s.label}>
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</span>
            <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)] mt-1">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Recommended Action" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Prioritize closing the {data.orphanCount} orphan-account offboarding gaps first — these represent live access nobody
          believes still exists. Follow with a review of dormant admin accounts for suspension, and a standing policy requiring
          cross-platform admin grants to require secondary approval.
        </p>
      </Card>
    </motion.div>
  );
}

function IncidentReport({ data }: { data: ExecutiveReportData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {data.incidents.map((inc, i) => (
        <Card key={inc.identity.identity_id} glow={inc.identity.risk_band === "CRITICAL" ? "identity" : "none"}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wide">
                Incident #{String(i + 1).padStart(3, "0")}
              </span>
              <h3 className="font-display text-lg font-bold text-[var(--color-text-primary)]">{inc.identity.full_name}</h3>
              <span className="text-xs text-[var(--color-text-muted)]">{inc.identity.department}</span>
            </div>
            <div className="text-right">
              <RiskBadge band={inc.identity.risk_band} />
              <div className="font-mono-tabular text-xl font-bold text-[var(--color-text-primary)] mt-1">
                {inc.identity.final_risk_score.toFixed(0)}/100
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Root Cause" value={rootCauseFor(inc.identity)} />
            <Field
              label="Business Impact"
              value={inc.remediation?.business_impact ?? "Potential unauthorized access to systems this identity can reach if compromised."}
            />
            <Field
              label="Affected Systems"
              value={inc.blastRadius ? `${inc.blastRadius.systems_impacted} systems, ${inc.blastRadius.critical_resources} critical resources` : "—"}
            />
            <Field label="Priority Level" value={inc.identity.risk_band} />
          </div>

          {inc.remediation && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border-soft)]">
              <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Recommended Mitigation</span>
              <ol className="mt-1.5 space-y-1">
                {inc.remediation.remediation_steps.map((s, j) => (
                  <li key={j} className="text-sm text-[var(--color-text-secondary)] flex gap-2">
                    <span className="font-mono text-[var(--color-ai)] shrink-0">{j + 1}.</span> {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      ))}
    </motion.div>
  );
}

function AuditReport({ data }: { data: ExecutiveReportData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader title="Risk Findings — Audit View" subtitle="Top 10 identities by computed risk score" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wide border-b border-[var(--color-border-soft)]">
                <th className="py-2 pr-4">Identity</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Platforms</th>
                <th className="py-2 pr-4">Risk Score</th>
                <th className="py-2 pr-4">Band</th>
                <th className="py-2 pr-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {data.topIdentities.map((i) => (
                <tr key={i.identity_id} className="border-b border-[var(--color-border-soft)] last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-[var(--color-text-primary)]">{i.full_name}</td>
                  <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{i.department}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{i.platforms.join(", ")}</td>
                  <td className="py-2.5 pr-4 font-mono-tabular">{i.risk_score.toFixed(0)}</td>
                  <td className="py-2.5 pr-4"><RiskBadge band={i.risk_band} /></td>
                  <td className="py-2.5 pr-4 text-xs">
                    {i.is_orphan && "ORPHAN "}{i.is_dormant_admin && "DORMANT_ADMIN"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Framework Alignment" subtitle="How these findings map to common governance controls" />
        <div className="space-y-2">
          {getComplianceMap().map((c) => (
            <div key={c.control} className="flex items-start gap-3 text-sm py-2 border-b border-[var(--color-border-soft)] last:border-0">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-elevated)] text-[var(--color-identity)] shrink-0">
                {c.control}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                {c.concern} — relevant to {c.relevantTo}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function BoardPresentation({ data }: { data: ExecutiveReportData }) {
  const healthScore = Math.max(0, Math.round(100 - data.avgRiskScore));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card glow="ai" className="text-center py-10">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Overall Security Posture</span>
        <div className="font-mono-tabular text-6xl font-bold text-[var(--color-text-primary)] mt-2">{healthScore}</div>
        <span className="text-sm text-[var(--color-text-muted)]">out of 100</span>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Identities at Risk", value: data.highRiskCount },
          { label: "Offboarding Gaps", value: data.orphanCount },
          { label: "Standing Privileged Access", value: data.dormantAdminCount },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <div className="font-mono-tabular text-3xl font-bold text-[var(--color-text-primary)]">{s.value}</div>
            <span className="text-xs text-[var(--color-text-muted)]">{s.label}</span>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Three-Point Ask" />
        <ol className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <li>1. Approve a 30-day remediation sprint targeting the {data.orphanCount} orphan accounts.</li>
          <li>2. Mandate quarterly attestation for all cross-platform admin grants ({data.crossPlatformAdminCount} currently).</li>
          <li>3. Fund automated offboarding sync across AD, AWS, Okta, and Salesforce to prevent recurrence.</li>
        </ol>
      </Card>
    </motion.div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] block mb-0.5">{label}</span>
      <span className="text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}

function StoryMode({ data, onExit }: { data: ExecutiveReportData; onExit: () => void }) {
  const slides = buildStorySlides(data);
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-base)]">
      <div className="aurora-mesh" />
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {index + 1} / {slides.length}
        </span>
        <button onClick={onExit} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          Exit Story Mode (Esc)
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl"
          >
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-ai)]">{slide.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mt-3 mb-6">
              {slide.headline}
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 pb-10">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="p-2 rounded-full bg-[var(--color-elevated)] disabled:opacity-30"
        >
          <ChevronLeft size={18} className="text-[var(--color-text-primary)]" />
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
          className="p-2 rounded-full bg-[var(--color-elevated)] disabled:opacity-30"
        >
          <ChevronRight size={18} className="text-[var(--color-text-primary)]" />
        </button>
      </div>
    </div>
  );
}

function buildStorySlides(data: ExecutiveReportData) {
  const top3 = data.topIdentities.slice(0, 3).map((i) => i.full_name).join(", ");
  return [
    {
      eyebrow: "AccessDNA AI",
      headline: "Identity Risk Briefing",
      body: `${data.totalIdentities} identities analyzed across AD, AWS, Okta, and Salesforce. ${data.highRiskCount} require attention.`,
    },
    {
      eyebrow: "Top Risks",
      headline: `${data.highRiskCount} High & Critical Identities`,
      body: `Led by ${top3}. These accounts combine cross-platform privilege, dormancy, or orphaned access into compounding risk.`,
    },
    {
      eyebrow: "Orphan Accounts",
      headline: `${data.orphanCount} Offboarding Gaps`,
      body: "Accounts disabled in Active Directory but still active elsewhere — the single highest-confidence finding in this report.",
    },
    {
      eyebrow: "Dormant Admins",
      headline: `${data.dormantAdminCount} Unused Privileged Accounts`,
      body: "Administrative access with no login in over 90 days. Standing privilege with no operational justification.",
    },
    {
      eyebrow: "Privilege Escalation",
      headline: `${data.crossPlatformAdminCount} Cross-Platform Admins`,
      body: "Identities holding administrative roles on two or more platforms simultaneously, widening the blast radius of any single compromise.",
    },
    {
      eyebrow: "Recommended Action",
      headline: "Close the Gaps in 30 Days",
      body: "Prioritize orphan account closure, mandate review of dormant admin access, and require approval for new cross-platform privilege grants.",
    },
  ];
}
