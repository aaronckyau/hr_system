import unittest
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import Employee, PayrollRecord, User, UserRole
from app.routers.payroll import current_hk_payroll_month


class PayrollReportsTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)

        def override_get_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app)

        with Session(self.engine) as session:
            admin = User(
                email="admin@example.com",
                full_name="Admin User",
                password_hash=hash_password("password123"),
                role=UserRole.admin,
            )
            hr_user = User(
                email="hr.employee@example.com",
                full_name="HR Employee",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            ops_user = User(
                email="ops.employee@example.com",
                full_name="Ops Employee",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(admin)
            session.add(hr_user)
            session.add(ops_user)
            session.commit()
            session.refresh(hr_user)
            session.refresh(ops_user)

            hr_employee = Employee(
                user_id=hr_user.id,
                employee_no="E201",
                hk_id="A123456(7)",
                department="HR",
                job_title="Officer",
                employment_start_date=date(2026, 1, 1),
                base_salary=20000,
            )
            ops_employee = Employee(
                user_id=ops_user.id,
                employee_no="E202",
                hk_id="B123456(7)",
                department="Operations",
                job_title="Assistant",
                employment_start_date=date(2026, 1, 1),
                base_salary=18000,
            )
            session.add(hr_employee)
            session.add(ops_employee)
            session.commit()
            session.refresh(hr_employee)
            session.refresh(ops_employee)

            session.add(
                PayrollRecord(
                    employee_id=hr_employee.id,
                    payroll_month="2026-04",
                    base_salary=20000,
                    gross_income=20000,
                    taxable_income=20000,
                    non_taxable_income=0,
                    deductions=0,
                    relevant_income=20000,
                    employee_mpf=1000,
                    employer_mpf=1000,
                    net_salary=19000,
                )
            )
            session.add(
                PayrollRecord(
                    employee_id=ops_employee.id,
                    payroll_month="2025-12",
                    base_salary=18000,
                    gross_income=18000,
                    taxable_income=18000,
                    non_taxable_income=0,
                    deductions=0,
                    relevant_income=18000,
                    employee_mpf=900,
                    employer_mpf=900,
                    net_salary=17100,
                )
            )
            session.commit()

    def tearDown(self):
        app.dependency_overrides.clear()

    def auth_headers(self) -> dict[str, str]:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin@example.com", "password": "password123"},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_generate_payroll_rejects_future_month(self):
        current_year, current_month = current_hk_payroll_month().split("-")
        future_month = f"{int(current_year) + 1}-{current_month}"

        response = self.client.post(
            "/api/payroll/generate",
            headers=self.auth_headers(),
            json={"payroll_month": future_month},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("未來月份薪資", response.json()["detail"])

    def test_ir56b_csv_filters_by_year_employee_and_department(self):
        headers = self.auth_headers()

        year_response = self.client.get("/api/reports/ir56b.csv?tax_year=2026", headers=headers)
        department_response = self.client.get("/api/reports/ir56b.csv?department=Operations", headers=headers)

        self.assertEqual(year_response.status_code, 200)
        self.assertIn("HR Employee", year_response.text)
        self.assertNotIn("Ops Employee", year_response.text)
        self.assertEqual(department_response.status_code, 200)
        self.assertIn("Ops Employee", department_response.text)
        self.assertNotIn("HR Employee", department_response.text)


if __name__ == "__main__":
    unittest.main()
