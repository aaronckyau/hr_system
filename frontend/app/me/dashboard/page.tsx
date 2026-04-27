import { LayoutShell } from "@/components/layout-shell";
import { EmployeePortalClient } from "@/components/portal-clients";

export default function MyDashboardPage() {
  return (
    <LayoutShell>
      <EmployeePortalClient />
    </LayoutShell>
  );
}
