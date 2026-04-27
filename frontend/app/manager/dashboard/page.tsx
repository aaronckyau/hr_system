import { LayoutShell } from "@/components/layout-shell";
import { ManagerDashboardClient } from "@/components/portal-clients";

export default function ManagerDashboardPage() {
  return (
    <LayoutShell>
      <ManagerDashboardClient view="dashboard" />
    </LayoutShell>
  );
}
