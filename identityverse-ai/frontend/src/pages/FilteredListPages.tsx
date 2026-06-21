import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, IdentityTable } from "@/components/Shared";
import { Loading } from "@/components/ui/Misc";
import type { IdentityListItem } from "@/types";

export function OrphanAccountsPage() {
  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listIdentities({ orphan_only: true, limit: 200 }).then(setIdentities).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Orphan Accounts"
        subtitle="Disabled in AD but still active on at least one other platform — the #1 offboarding gap that leaves access live after someone leaves."
      />
      {loading ? <Loading label="Scanning for offboarding gaps" /> : <IdentityTable identities={identities} />}
    </div>
  );
}

export function DormantAdminsPage() {
  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listIdentities({ dormant_admin_only: true, limit: 200 }).then(setIdentities).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dormant Admins"
        subtitle="Admin-level access with no login in over 90 days — standing privilege nobody is actively using, and an easy target if compromised."
      />
      {loading ? <Loading label="Checking admin login activity" /> : <IdentityTable identities={identities} />}
    </div>
  );
}
