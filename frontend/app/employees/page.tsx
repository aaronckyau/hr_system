import { EmployeesClient } from "@/components/employees-client";
import { LayoutShell } from "@/components/layout-shell";


export default function EmployeesPage() {
  return (
    <LayoutShell>
      <EmployeesClient />
    </LayoutShell>
  );
}

