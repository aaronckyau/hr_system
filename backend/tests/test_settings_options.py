import unittest

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import AuditEvent, AuditLog, SettingCategory, SettingOption, User, UserRole
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


if __name__ == "__main__":
    unittest.main()
