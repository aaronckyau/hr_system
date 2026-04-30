import unittest
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import AuditEvent, AuditLog, DeductionItem, DeductionType, EarningItem, EarningType, Employee, PayrollRecord, PayrollStatus, SettingCategory, SettingOption, User, UserRole
from app.services.data_cleanup import normalize_demo_data
from app.services.settings import seed_default_setting_options


class SettingsOptionsTestCase(unittest.TestCase):
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
            session.add(
                User(
                    email="admin@example.com",
                    full_name="Admin User",
                    password_hash=hash_password("password123"),
                    role=UserRole.admin,
                )
            )
            session.add(
                User(
                    email="employee@example.com",
                    full_name="Employee User",
                    password_hash=hash_password("password123"),
                    role=UserRole.employee,
                )
            )
            session.add(
                User(
                    email="manager@example.com",
                    full_name="Manager User",
                    password_hash=hash_password("password123"),
                    role=UserRole.manager,
                )
            )
            session.commit()
            seed_default_setting_options(session)

    def tearDown(self):
        app.dependency_overrides.clear()

    def auth_headers(self, email: str) -> dict[str, str]:
        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "password123"},
        )
        self.assertEqual(response.status_code, 200)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_admin_can_create_setting_option_and_audit_log(self):
        response = self.client.post(
            "/api/settings/options",
            headers=self.auth_headers("admin@example.com"),
            json={
                "category": "position",
                "value": "qa_manager",
                "label": "QA Manager",
                "display_order": 50,
                "is_active": True,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["value"], "qa_manager")

        with Session(self.engine) as session:
            option = session.exec(select(SettingOption).where(SettingOption.value == "qa_manager")).first()
            self.assertIsNotNone(option)
            audit = session.exec(select(AuditLog).where(AuditLog.event_type == AuditEvent.setting_option_saved)).first()
            self.assertIsNotNone(audit)

    def test_employee_cannot_create_setting_option(self):
        response = self.client.post(
            "/api/settings/options",
            headers=self.auth_headers("employee@example.com"),
            json={
                "category": "department",
                "value": "private_department",
                "label": "Private Department",
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_employee_cannot_see_inactive_setting_options(self):
        with Session(self.engine) as session:
            session.add(
                SettingOption(
                    category=SettingCategory.department,
                    value="inactive_department",
                    label="Inactive Department",
                    is_active=False,
                )
            )
            session.commit()

        response = self.client.get(
            "/api/settings/options?include_inactive=true",
            headers=self.auth_headers("employee@example.com"),
        )

        self.assertEqual(response.status_code, 200)
        values = {item["value"] for item in response.json()}
        self.assertNotIn("inactive_department", values)

    def test_default_bank_options_are_seeded(self):
        response = self.client.get(
            "/api/settings/options?category=bank",
            headers=self.auth_headers("admin@example.com"),
        )

        self.assertEqual(response.status_code, 200)
        values = {item["value"] for item in response.json()}
        self.assertIn("HSBC", values)
        self.assertIn("BOC Hong Kong", values)

    def test_default_payroll_and_leave_type_options_are_seeded(self):
        headers = self.auth_headers("admin@example.com")

        leave_response = self.client.get("/api/settings/options?category=leave_type", headers=headers)
        earning_response = self.client.get("/api/settings/options?category=earning_type", headers=headers)
        deduction_response = self.client.get("/api/settings/options?category=deduction_type", headers=headers)

        self.assertEqual(leave_response.status_code, 200)
        self.assertEqual(earning_response.status_code, 200)
        self.assertEqual(deduction_response.status_code, 200)
        self.assertIn("annual", {item["value"] for item in leave_response.json()})
        self.assertIn("commission", {item["value"] for item in earning_response.json()})
        self.assertIn("late", {item["value"] for item in deduction_response.json()})

    def test_restricted_setting_category_rejects_unsupported_value(self):
        response = self.client.post(
            "/api/settings/options",
            headers=self.auth_headers("admin@example.com"),
            json={
                "category": "earning_type",
                "value": "custom_allowance",
                "label": "Custom Allowance",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_can_create_employee_with_work_location(self):
        response = self.client.post(
            "/api/employees",
            headers=self.auth_headers("admin@example.com"),
            json={
                "email": "new.employee@example.com",
                "full_name": "New Employee",
                "role": "employee",
                "employee_no": "E900",
                "hk_id": "A123456(7)",
                "department": "HR",
                "job_title": "Officer",
                "employment_start_date": "2026-04-01",
                "employment_type": "full_time",
                "work_location": "Hong Kong Office",
                "annual_leave_balance": 14,
                "base_salary": 20000,
                "allowances": 0,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["work_location"], "Hong Kong Office")

    def test_employee_create_normalizes_legacy_master_values(self):
        response = self.client.post(
            "/api/employees",
            headers=self.auth_headers("admin@example.com"),
            json={
                "email": "legacy.employee@example.com",
                "full_name": "Legacy Employee",
                "role": "employee",
                "employee_no": "E905",
                "hk_id": "A123456(7)",
                "department": "Human Resources",
                "job_title": "Operations Assistant",
                "employment_start_date": "2026-04-01",
                "employment_type": "full_time",
                "employment_status": "active",
                "work_location": "Central Office",
                "annual_leave_balance": 14,
                "base_salary": 20000,
                "allowances": 0,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["department"], "HR")
        self.assertEqual(response.json()["job_title"], "Assistant")
        self.assertEqual(response.json()["work_location"], "Hong Kong Office")

    def test_employee_update_rejects_empty_master_values(self):
        create_response = self.client.post(
            "/api/employees",
            headers=self.auth_headers("admin@example.com"),
            json={
                "email": "editable.employee@example.com",
                "full_name": "Editable Employee",
                "role": "employee",
                "employee_no": "E906",
                "hk_id": "A123456(7)",
                "department": "HR",
                "job_title": "Officer",
                "employment_start_date": "2026-04-01",
                "employment_type": "full_time",
                "employment_status": "active",
                "annual_leave_balance": 14,
                "base_salary": 20000,
                "allowances": 0,
            },
        )
        self.assertEqual(create_response.status_code, 201)

        update_response = self.client.patch(
            f"/api/employees/{create_response.json()['id']}",
            headers=self.auth_headers("admin@example.com"),
            json={"job_title": ""},
        )

        self.assertEqual(update_response.status_code, 400)

    def test_normalize_demo_data_cleans_legacy_values_and_future_drafts(self):
        with Session(self.engine) as session:
            user = User(
                email="demo.cleanup@example.com",
                full_name="Demo Cleanup",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            employee = Employee(
                user_id=user.id,
                employee_no="E907",
                hk_id="A123456(7)",
                department="Human Resources",
                job_title="Operations Assistant",
                employment_start_date=date(2026, 4, 1),
                work_location="Central Office",
                bank_name="Demo Bank",
                base_salary=20000,
            )
            session.add(employee)
            session.commit()
            session.refresh(employee)
            session.add(
                PayrollRecord(
                    employee_id=employee.id,
                    payroll_month="2099-01",
                    base_salary=20000,
                    gross_income=20000,
                    relevant_income=20000,
                    employee_mpf=1000,
                    employer_mpf=1000,
                    net_salary=19000,
                    status=PayrollStatus.draft,
                )
            )
            session.add(
                EarningItem(
                    employee_id=employee.id,
                    payroll_month="2026-04",
                    earning_type=EarningType.commission,
                    amount=500,
                    description="Production demo commission",
                )
            )
            session.add(
                DeductionItem(
                    employee_id=employee.id,
                    payroll_month="2026-04",
                    deduction_type=DeductionType.late,
                    amount=100,
                    reason="Production demo late deduction",
                )
            )
            session.commit()

            normalize_demo_data(session)
            session.refresh(employee)
            self.assertEqual(employee.department, "HR")
            self.assertEqual(employee.job_title, "Assistant")
            self.assertEqual(employee.work_location, "Hong Kong Office")
            self.assertEqual(employee.bank_name, "匯豐")
            self.assertIsNone(session.exec(select(PayrollRecord).where(PayrollRecord.payroll_month == "2099-01")).first())
            self.assertEqual(session.exec(select(EarningItem)).first().description, "示範佣金")
            self.assertEqual(session.exec(select(DeductionItem)).first().reason, "示範遲到扣款")

    def test_manager_sees_only_direct_reports_with_sensitive_fields_masked(self):
        with Session(self.engine) as session:
            manager = session.exec(select(User).where(User.email == "manager@example.com")).first()
            direct_user = User(
                email="direct@example.com",
                full_name="Direct Report",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            other_user = User(
                email="other@example.com",
                full_name="Other Employee",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(direct_user)
            session.add(other_user)
            session.commit()
            session.refresh(direct_user)
            session.refresh(other_user)

            session.add(
                Employee(
                    user_id=direct_user.id,
                    manager_user_id=manager.id,
                    employee_no="E901",
                    hk_id="A123456(7)",
                    department="HR",
                    job_title="Officer",
                    employment_start_date=date(2026, 4, 1),
                    base_salary=25000,
                    allowances=1000,
                    bank_account_no="123456789",
                )
            )
            session.add(
                Employee(
                    user_id=other_user.id,
                    employee_no="E902",
                    hk_id="B765432(1)",
                    department="Finance",
                    job_title="Analyst",
                    employment_start_date=date(2026, 4, 1),
                    base_salary=30000,
                    allowances=0,
                    bank_account_no="987654321",
                )
            )
            session.commit()

        response = self.client.get("/api/employees", headers=self.auth_headers("manager@example.com"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["employee_no"], "E901")
        self.assertEqual(payload[0]["hk_id"], "A123******")
        self.assertEqual(payload[0]["base_salary"], 0)
        self.assertEqual(payload[0]["bank_account_no"], "*****6789")

    def test_employee_only_sees_own_employee_record(self):
        with Session(self.engine) as session:
            employee_user = session.exec(select(User).where(User.email == "employee@example.com")).first()
            other_user = User(
                email="hidden@example.com",
                full_name="Hidden Employee",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(other_user)
            session.commit()
            session.refresh(other_user)

            session.add(
                Employee(
                    user_id=employee_user.id,
                    employee_no="E903",
                    hk_id="C123456(7)",
                    department="HR",
                    job_title="Officer",
                    employment_start_date=date(2026, 4, 1),
                    base_salary=20000,
                    bank_account_no="11112222",
                )
            )
            session.add(
                Employee(
                    user_id=other_user.id,
                    employee_no="E904",
                    hk_id="D123456(7)",
                    department="Finance",
                    job_title="Analyst",
                    employment_start_date=date(2026, 4, 1),
                    base_salary=30000,
                    bank_account_no="33334444",
                )
            )
            session.commit()

        response = self.client.get("/api/employees", headers=self.auth_headers("employee@example.com"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["employee_no"], "E903")
        self.assertEqual(payload[0]["hk_id"], "C123456(7)")
        self.assertEqual(payload[0]["base_salary"], 20000)


if __name__ == "__main__":
    unittest.main()
