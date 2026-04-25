import unittest
from datetime import date

from sqlmodel import Session, SQLModel, create_engine

from app.models import Employee, LeaveConfig, LeaveRequest, LeaveStatus, LeaveType, PayrollConfig, PublicHoliday, User, UserRole
from app.services.leave import calculate_leave_summary_for_range
from app.services.payroll import get_unpaid_leave_deduction


class LeaveRulesTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(self.engine)

    def test_working_days_exclude_public_holidays_and_weekends(self):
        summary = calculate_leave_summary_for_range(
            start_date=date(2026, 4, 3),
            end_date=date(2026, 4, 7),
            public_holiday_dates={date(2026, 4, 3), date(2026, 4, 6), date(2026, 4, 7)},
            saturday_is_workday=False,
            is_half_day=False,
        )
        self.assertEqual(summary["calendar_days"], 5)
        self.assertEqual(summary["excluded_public_holidays"], 3)
        self.assertEqual(summary["days"], 0.0)

    def test_half_day_leave_counts_as_half_day(self):
        summary = calculate_leave_summary_for_range(
            start_date=date(2026, 4, 8),
            end_date=date(2026, 4, 8),
            public_holiday_dates=set(),
            saturday_is_workday=False,
            is_half_day=True,
        )
        self.assertEqual(summary["calendar_days"], 1)
        self.assertEqual(summary["days"], 0.5)

    def test_half_day_unpaid_leave_affects_payroll_deduction(self):
        with Session(self.engine) as session:
            user = User(
                email="employee@example.com",
                full_name="測試員工",
                password_hash="x",
                role=UserRole.employee,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            employee = Employee(
                user_id=user.id,
                employee_no="E900",
                hk_id="A123456(7)",
                department="HR",
                job_title="Officer",
                employment_start_date=date(2026, 1, 1),
                annual_leave_balance=14,
                base_salary=30000,
                allowances=0,
            )
            session.add(employee)
            session.add(LeaveConfig(saturday_is_workday=False))
            session.add(
                PayrollConfig(
                    daily_salary_divisor=30,
                    mpf_rate=0.05,
                    mpf_cap=1500,
                    min_relevant_income=7100,
                    max_relevant_income=30000,
                    new_employee_mpf_exempt_days=30,
                )
            )
            session.add(PublicHoliday(holiday_date=date(2026, 4, 7), name="清明節翌日", is_active=True))
            session.commit()
            session.refresh(employee)

            leave = LeaveRequest(
                employee_id=employee.id,
                leave_type=LeaveType.unpaid,
                start_date=date(2026, 4, 8),
                end_date=date(2026, 4, 8),
                days=0.5,
                calendar_days=1,
                excluded_public_holidays=0,
                is_half_day=True,
                status=LeaveStatus.approved,
            )
            session.add(leave)
            session.commit()

            deduction, unpaid_days, daily_rate = get_unpaid_leave_deduction(
                session=session,
                employee_id=employee.id,
                payroll_month="2026-04",
                base_salary=employee.base_salary,
                daily_salary_divisor=30,
            )

            self.assertEqual(unpaid_days, 0.5)
            self.assertEqual(daily_rate, 1000.0)
            self.assertEqual(deduction, 500.0)


if __name__ == "__main__":
    unittest.main()
