import unittest
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import AuditEvent, AuditLog, Employee, LeaveRequest, LeaveStatus, LeaveType, User, UserRole
from app.routers.leaves import today_hk


class LeaveComplianceAuditTestCase(unittest.TestCase):
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
            employee_user = User(
                email="employee@example.com",
                full_name="Employee User",
                password_hash=hash_password("password123"),
                role=UserRole.employee,
            )
            session.add(admin)
            session.add(employee_user)
            session.commit()
            session.refresh(employee_user)

            employee = Employee(
                user_id=employee_user.id,
                employee_no="E301",
                hk_id="A123456(7)",
                department="Operations",
                job_title="Assistant",
                employment_start_date=today_hk(),
                base_salary=20000,
            )
            session.add(employee)
            session.commit()
            session.refresh(employee)
            self.employee_id = employee.id

    def tearDown(self):
        app.dependency_overrides.clear()

    def auth_headers(self, email: str = "admin@example.com") -> dict[str, str]:
        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "password123"},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_leave_application_rejects_past_start_date(self):
        yesterday = today_hk() - timedelta(days=1)

        response = self.client.post(
            "/api/leaves",
            headers=self.auth_headers(),
            json={
                "employee_id": self.employee_id,
                "leave_type": "annual",
                "start_date": yesterday.isoformat(),
                "end_date": yesterday.isoformat(),
                "is_half_day": False,
                "reason": "Past leave should be blocked",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("不允許提交過去日期", response.json()["detail"])

    def test_leave_application_writes_audit_log(self):
        leave_date = today_hk() + timedelta(days=7)

        response = self.client.post(
            "/api/leaves",
            headers=self.auth_headers(),
            json={
                "employee_id": self.employee_id,
                "leave_type": "annual",
                "start_date": leave_date.isoformat(),
                "end_date": leave_date.isoformat(),
                "is_half_day": False,
                "reason": "Compliance audit test",
            },
        )

        self.assertEqual(response.status_code, 201)
        with Session(self.engine) as session:
            audit = session.exec(select(AuditLog).where(AuditLog.event_type == AuditEvent.leave_created)).first()
            self.assertIsNotNone(audit)
            self.assertIn("提交請假申請", audit.summary)
            self.assertIn("年假", audit.summary)

    def test_leave_status_update_writes_audit_log(self):
        leave_date = today_hk() + timedelta(days=8)
        with Session(self.engine) as session:
            leave = LeaveRequest(
                employee_id=self.employee_id,
                leave_type=LeaveType.annual,
                start_date=leave_date,
                end_date=leave_date,
                days=1,
                calendar_days=1,
                status=LeaveStatus.pending,
            )
            session.add(leave)
            session.commit()
            session.refresh(leave)
            leave_id = leave.id

        response = self.client.patch(
            f"/api/leaves/{leave_id}/status",
            headers=self.auth_headers(),
            json={"status": "approved"},
        )

        self.assertEqual(response.status_code, 200)
        with Session(self.engine) as session:
            audit = session.exec(select(AuditLog).where(AuditLog.event_type == AuditEvent.leave_status_updated)).first()
            self.assertIsNotNone(audit)
            self.assertIn("更新請假狀態", audit.summary)
            self.assertIn("待批", audit.summary)
            self.assertIn("已批准", audit.summary)


if __name__ == "__main__":
    unittest.main()
