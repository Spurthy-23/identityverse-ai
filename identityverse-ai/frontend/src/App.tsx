import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { CommandCenterBackdrop } from "@/components/ParticleField";
import CommandCenter from "@/pages/CommandCenter";
import IdentityExplorer from "@/pages/IdentityExplorer";
import IdentityProfile from "@/pages/IdentityProfile";
import IdentityGraphPage from "@/pages/IdentityGraphPage";
import BlastRadiusPage from "@/pages/BlastRadiusPage";
import BreachSimulatorPage from "@/pages/BreachSimulatorPage";
import ThreatRadarPage from "@/pages/ThreatRadarPage";
import ForecastEnginePage from "@/pages/ForecastEnginePage";
import { OrphanAccountsPage, DormantAdminsPage } from "@/pages/FilteredListPages";
import PrivilegeCreepPage from "@/pages/PrivilegeCreepPage";
import CopilotPage from "@/pages/CopilotPage";
import RemediationCenterPage from "@/pages/RemediationCenterPage";
import ExecutiveReportsPage from "@/pages/ExecutiveReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <CommandCenterBackdrop />
      <div className="flex relative z-[1]">
        <Sidebar />
        <main className="flex-1 px-8 py-8 max-w-[1400px]">
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/identities" element={<IdentityExplorer />} />
            <Route path="/identities/:id" element={<IdentityProfile />} />
            <Route path="/graph" element={<IdentityGraphPage />} />
            <Route path="/blast-radius" element={<BlastRadiusPage />} />
            <Route path="/breach-simulator" element={<BreachSimulatorPage />} />
            <Route path="/threat-radar" element={<ThreatRadarPage />} />
            <Route path="/orphans" element={<OrphanAccountsPage />} />
            <Route path="/dormant-admins" element={<DormantAdminsPage />} />
            <Route path="/privilege-creep" element={<PrivilegeCreepPage />} />
            <Route path="/forecast" element={<ForecastEnginePage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/remediation" element={<RemediationCenterPage />} />
            <Route path="/reports" element={<ExecutiveReportsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
