import { LayoutShell } from "@/components/layout-shell";
import { ManagerDashboardClient } from "@/components/portal-clients";

export default function ManagerTeamCalendarPage() {
  return (
    <LayoutShell>
      <ManagerDashboardClient view="calendar" />
    </LayoutShell>
  );
}
