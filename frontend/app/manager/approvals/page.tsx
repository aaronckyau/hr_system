import { LayoutShell } from "@/components/layout-shell";
import { ManagerDashboardClient } from "@/components/portal-clients";

export default function ManagerApprovalsPage() {
  return (
    <LayoutShell>
      <ManagerDashboardClient view="approvals" />
    </LayoutShell>
  );
}
