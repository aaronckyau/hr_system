import { LayoutShell } from "@/components/layout-shell";
import { ManagerDashboardClient } from "@/components/portal-clients";

export default function ManagerTeamPage() {
  return (
    <LayoutShell>
      <ManagerDashboardClient view="team" />
    </LayoutShell>
  );
}
