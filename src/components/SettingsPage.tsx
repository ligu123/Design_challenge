import type { AgentConfig, PlaceId, PolicyPlaybook } from "../types";
import { EnvironmentsPage } from "./EnvironmentsPage";
import { MemoryPage } from "./MemoryPage";
import { PoliciesPage } from "./PoliciesPage";

type SettingsPlace = Extract<PlaceId, "memory" | "environments" | "policies">;

const TABS: { id: SettingsPlace; label: string; description: string }[] = [
  {
    id: "policies",
    label: "Policies",
    description: "Permission playbooks and session defaults for the agent.",
  },
  {
    id: "memory",
    label: "Memory",
    description: "Decisions, conventions, and Q&A the agent remembers.",
  },
  {
    id: "environments",
    label: "Environments",
    description: "Test, CI, and deploy targets linked to runs.",
  },
];

interface SettingsPageProps {
  place: SettingsPlace;
  onNavigate: (place: SettingsPlace) => void;
  policies: PolicyPlaybook[];
  selectedPolicyId: string;
  activePolicyId: string;
  onSelectPolicy: (id: string) => void;
  onApplyPolicy: (policy: PolicyPlaybook) => void;
  config: AgentConfig;
}

export function SettingsPage({
  place,
  onNavigate,
  policies,
  selectedPolicyId,
  activePolicyId,
  onSelectPolicy,
  onApplyPolicy,
  config,
}: SettingsPageProps) {
  const activeTab = TABS.find((tab) => tab.id === place) ?? TABS[0];

  return (
    <main className="center center-span">
      <div className="center-body settings-body">
        <div className="settings-page">
          <header className="settings-page-header">
            <h1>Settings</h1>
          </header>

          <div className="settings-frame">
            <nav className="settings-nav" role="tablist" aria-label="Settings">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`settings-nav-item${place === tab.id ? " active" : ""}`}
                  aria-selected={place === tab.id}
                  onClick={() => onNavigate(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="settings-main" role="tabpanel">
              <header className="settings-section-header">
                <h2>{activeTab.label}</h2>
                <p>{activeTab.description}</p>
              </header>

              {place === "policies" && (
                <PoliciesPage
                  policies={policies}
                  selectedId={selectedPolicyId}
                  activePolicyId={activePolicyId}
                  onSelect={onSelectPolicy}
                  onApply={onApplyPolicy}
                  config={config}
                />
              )}
              {place === "memory" && <MemoryPage />}
              {place === "environments" && <EnvironmentsPage />}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
