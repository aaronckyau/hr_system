from fastapi import APIRouter, Depends, Response
from sqlmodel import Session, select

from app.core.security import get_current_user, require_roles
from app.db import get_session
from app.models import AuditEvent, Employee, PayrollRecord, User, UserRole
from app.routers.employees import to_employee_read
from app.routers.payroll import get_payroll_with_access_check, to_payroll_read
from app.services.exporters import export_ir56b_csv, export_ir56b_excel, export_payslip_html
from app.services.payroll import build_payroll_components
from app.services.audit import write_audit_log


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/ir56b.csv")
def download_ir56b_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employees = session.exec(select(Employee)).all()
    employee_reads = []
    payroll_by_employee = {}
    for employee in employees:
        user = session.get(User, employee.user_id)
        if not user:
            continue
        employee_reads.append(to_employee_read(employee, user, current_user))
        payrolls = session.exec(select(PayrollRecord).where(PayrollRecord.employee_id == employee.id)).all()
        payroll_by_employee[employee.id] = [to_payroll_read(payroll, employee, user) for payroll in payrolls]

    content = export_ir56b_csv(employee_reads, payroll_by_employee)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.report_downloaded,
        entity_type="report",
        entity_id=None,
        summary="下載 IR56B CSV 報表",
        metadata={"format": "csv", "employee_count": len(employee_reads)},
    )
    headers = {"Content-Disposition": 'attachment; filename="ir56b-report.csv"'}
    return Response(content=content, media_type="text/csv; charset=utf-8", headers=headers)


@router.get("/ir56b.xlsx")
def download_ir56b_excel(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employees = session.exec(select(Employee)).all()
    employee_reads = []
    payroll_by_employee = {}
    for employee in employees:
        user = session.get(User, employee.user_id)
        if not user:
            continue
        employee_reads.append(to_employee_read(employee, user, current_user))
        payrolls = session.exec(select(PayrollRecord).where(PayrollRecord.employee_id == employee.id)).all()
        payroll_by_employee[employee.id] = [to_payroll_read(payroll, employee, user) for payroll in payrolls]

    content = export_ir56b_excel(employee_reads, payroll_by_employee)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.report_downloaded,
        entity_type="report",
        entity_id=None,
        summary="下載 IR56B Excel 報表",
        metadata={"format": "xlsx", "employee_count": len(employee_reads)},
    )
    headers = {"Content-Disposition": 'attachment; filename="ir56b-report.xlsx"'}
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/payslip/{payroll_id}")
def download_payslip(
    payroll_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    payroll, employee, user = get_payroll_with_access_check(session, payroll_id, current_user)
    employee_read = to_employee_read(employee, user, current_user)
    payroll_read = to_payroll_read(payroll, employee, user)
    components = build_payroll_components(session, employee, payroll.payroll_month)

    earnings_breakdown = [
        {
            "description": "基本月薪",
            "meta": "固定收入 / 應課稅 / 納入 MPF",
            "amount": employee.base_salary,
        },
        {
            "description": "固定津貼",
            "meta": "固定收入 / 應課稅 / 納入 MPF",
            "amount": employee.allowances,
        },
        *[
            {
                "description": item.description,
                "meta": f"{item.earning_type.value} / {'應課稅' if item.is_taxable else '非應課稅'} / {'納入 MPF' if item.counts_for_mpf else '不納入 MPF'}",
                "amount": item.amount,
            }
            for item in components["earning_items"]
        ],
    ]

    deductions_breakdown = []
    if components["unpaid_leave_amount"] > 0:
        deductions_breakdown.append(
            {
                "description": "無薪假",
                "meta": f"已批准無薪假 {components['unpaid_leave_days']} 天",
                "amount": components["unpaid_leave_amount"],
            }
        )
    deductions_breakdown.extend(
        {
            "description": item.deduction_type.value,
            "meta": item.reason,
            "amount": item.amount,
        }
        for item in components["manual_deductions"]
    )

    employee_mpf_formula = (
        f"豁免：{components['employee_mpf_exempt_reason']}"
        if components["employee_mpf_exempt"]
        else f"{payroll.employee_mpf:.2f} = {payroll.relevant_income:.2f} x {components['config'].mpf_rate:.2%}"
    )
    formulas = {
        "relevant_income_formula": f"{payroll.gross_income:.2f} - {payroll.deductions:.2f} = {payroll.relevant_income:.2f}",
        "employee_mpf_formula": employee_mpf_formula,
        "employer_mpf_formula": f"{payroll.employer_mpf:.2f} = {payroll.relevant_income:.2f} x {components['config'].mpf_rate:.2%}",
        "net_salary_formula": f"{payroll.gross_income:.2f} - {payroll.deductions:.2f} - {payroll.employee_mpf:.2f} = {payroll.net_salary:.2f}",
    }

    content = export_payslip_html(
        employee=employee_read,
        payroll=payroll_read,
        earnings_breakdown=earnings_breakdown,
        deductions_breakdown=deductions_breakdown,
        formulas=formulas,
    )
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.payslip_downloaded,
        entity_type="payroll",
        entity_id=payroll.id,
        summary=f"下載糧單：{user.full_name} / {payroll.payroll_month}",
        metadata={"employee_id": employee.id, "payroll_month": payroll.payroll_month},
    )
    headers = {"Content-Disposition": f'attachment; filename="payslip-{payroll.payroll_month}-{employee.employee_no}.html"'}
    return Response(content=content, media_type="text/html; charset=utf-8", headers=headers)
