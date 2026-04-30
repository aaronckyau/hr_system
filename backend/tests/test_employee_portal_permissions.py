import unittest
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import Employee, LeaveRequest, LeaveStatus, LeaveType, PayrollRecord, User, UserRole
from app.routers.leaves import today_hk


class EmployeePortalPermissionsTestCase(unittest.TestCase):
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
            own_user = User(
                email="employee@example.com",
                full_name="Employee User",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            other_user = User(
                email="other.employee@example.com",
                full_name="Other Employee",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(own_user)
            session.add(other_user)
            session.commit()
            session.refresh(own_user)
            session.refresh(other_user)

            own_employee = Employee(
                user_id=own_user.id,
                employee_no="E101",
                hk_id="A123456(7)",
                department="Operations",
                job_title="Operations Assistant",
                employment_start_date=date(2026, 4, 1),
                base_salary=20000,
                allowances=500,
                bank_name="HSBC",
                bank_account_no="111122223333",
            )
            other_employee = Employee(
                user_id=other_user.id,
                employee_no="E102",
                hk_id="B123456(7)",
                department="Finance",
                job_title="Analyst",
                employment_start_date=date(2026, 4, 1),
                base_salary=30000,
                allowances=1000,
                bank_name="Hang Seng Bank",
                bank_account_no="999988887777",
            )
            session.add(own_employee)
            session.add(other_employee)
            session.commit()
            session.refresh(own_employee)
            session.refresh(other_employee)

            session.add(
                LeaveRequest(
                    employee_id=own_employee.id,
                    leave_type=LeaveType.annual,
                    start_date=date(2026, 4, 10),
                    end_date=date(2026, 4, 10),
                    days=1,
                    calendar_days=1,
                    status=LeaveStatus.approved,
                )
            )
            session.add(
                LeaveRequest(
                    employee_id=other_employee.id,
                    leave_type=LeaveType.sick,
                    start_date=date(2026, 4, 11),
                    end_date=date(2026, 4, 11),
                    days=1,
                    calendar_days=1,
                    status=LeaveStatus.pending,
                )
            )
            session.add(
                PayrollRecord(
                    employee_id=own_employee.id,
                    payroll_month="2026-04",
                    base_salary=20000,
                    allowances=500,
                    gross_income=20500,
                    taxable_income=20500,
                    non_taxable_income=0,
                    deductions=0,
                    relevant_income=20500,
                    employee_mpf=1025,
                    employer_mpf=1025,
                    net_salary=19475,
                )
            )
            session.add(
                PayrollRecord(
                    employee_id=other_employee.id,
                    payroll_month="2026-04",
                    base_salary=30000,
                    allowances=1000,
                    gross_income=31000,
                    taxable_income=31000,
                    non_taxable_income=0,
                    deductions=0,
                    relevant_income=30000,
                    employee_mpf=1500,
                    employer_mpf=1500,
                    net_salary=29500,
                )
            )
            session.commit()

    def tearDown(self):
        app.dependency_overrides.clear()

    def auth_headers(self) -> dict[str, str]:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "employee@example.com", "password": "password123"},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_employee_portal_lists_only_own_records(self):
        headers = self.auth_headers()

        employees_response = self.client.get("/api/employees", headers=headers)
        leaves_response = self.client.get("/api/leaves", headers=headers)
        payroll_response = self.client.get("/api/payroll", headers=headers)

        self.assertEqual(employees_response.status_code, 200)
        self.assertEqual(leaves_response.status_code, 200)
        self.assertEqual(payroll_response.status_code, 200)
        self.assertEqual([item["employee_no"] for item in employees_response.json()], ["E101"])
        self.assertEqual([item["employee_name"] for item in leaves_response.json()], ["Employee User"])
        self.assertEqual([item["employee_name"] for item in payroll_response.json()], ["Employee User"])

    def test_employee_cannot_read_other_employee_payroll_detail_or_payslip(self):
        headers = self.auth_headers()
        with Session(self.engine) as session:
            other_employee = session.exec(select(Employee).where(Employee.employee_no == "E102")).first()
            other_payroll = session.exec(select(PayrollRecord).where(PayrollRecord.employee_id == other_employee.id)).first()

        detail_response = self.client.get(f"/api/payroll/{other_payroll.id}", headers=headers)
        payslip_response = self.client.get(f"/api/reports/payslip/{other_payroll.id}", headers=headers)

        self.assertEqual(detail_response.status_code, 403)
        self.assertEqual(payslip_response.status_code, 403)

    def test_employee_leave_application_is_bound_to_own_profile(self):
        headers = self.auth_headers()
        leave_date = today_hk() + timedelta(days=7)
        with Session(self.engine) as session:
            own_employee = session.exec(select(Employee).where(Employee.employee_no == "E101")).first()
            other_employee = session.exec(select(Employee).where(Employee.employee_no == "E102")).first()

        response = self.client.post(
            "/api/leaves",
            headers=headers,
            json={
                "employee_id": other_employee.id,
                "leave_type": "annual",
                "start_date": leave_date.isoformat(),
                "end_date": leave_date.isoformat(),
                "is_half_day": False,
                "reason": "Self-service test",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["employee_id"], own_employee.id)
        self.assertEqual(response.json()["employee_name"], "Employee User")


if __name__ == "__main__":
    unittest.main()
