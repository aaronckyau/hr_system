import csv
from io import BytesIO, StringIO

from openpyxl import Workbook

from app.schemas import EmployeeRead, PayrollRead


def export_ir56b_csv(employees: list[EmployeeRead], payroll_by_employee: dict[int, list[PayrollRead]]) -> bytes:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "員工編號",
            "姓名",
            "香港身份證",
            "稅務檔案號碼",
            "部門",
            "職位",
            "全年收入",
            "僱員 MPF 合計",
            "僱主 MPF 合計",
        ]
    )
    for employee in employees:
        payrolls = payroll_by_employee.get(employee.id, [])
        annual_income = round(sum(item.relevant_income for item in payrolls), 2)
        employee_mpf = round(sum(item.employee_mpf for item in payrolls), 2)
        employer_mpf = round(sum(item.employer_mpf for item in payrolls), 2)
        writer.writerow(
            [
                employee.employee_no,
                employee.full_name,
                employee.hk_id,
                employee.tax_file_no or "",
                employee.department,
                employee.job_title,
                annual_income,
                employee_mpf,
                employer_mpf,
            ]
        )
    return buffer.getvalue().encode("utf-8-sig")


def export_ir56b_excel(employees: list[EmployeeRead], payroll_by_employee: dict[int, list[PayrollRead]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "IR56B"
    headers = [
        "員工編號",
        "姓名",
        "香港身份證",
        "稅務檔案號碼",
        "部門",
        "職位",
        "全年收入",
        "僱員 MPF 合計",
        "僱主 MPF 合計",
    ]
    sheet.append(headers)
    for employee in employees:
        payrolls = payroll_by_employee.get(employee.id, [])
        sheet.append(
            [
                employee.employee_no,
                employee.full_name,
                employee.hk_id,
                employee.tax_file_no or "",
                employee.department,
                employee.job_title,
                round(sum(item.relevant_income for item in payrolls), 2),
                round(sum(item.employee_mpf for item in payrolls), 2),
                round(sum(item.employer_mpf for item in payrolls), 2),
            ]
        )

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def export_payslip_html(
    employee: EmployeeRead,
    payroll: PayrollRead,
    earnings_breakdown: list[dict],
    deductions_breakdown: list[dict],
    formulas: dict[str, str],
) -> bytes:
    earnings_rows = "".join(
        f"""
        <tr>
          <td>{item['description']}</td>
          <td>{item['meta']}</td>
          <td style="text-align:right;">HK${item['amount']:.2f}</td>
        </tr>
        """
        for item in earnings_breakdown
    )
    deductions_rows = "".join(
        f"""
        <tr>
          <td>{item['description']}</td>
          <td>{item['meta']}</td>
          <td style="text-align:right;">HK${item['amount']:.2f}</td>
        </tr>
        """
        for item in deductions_breakdown
    ) or """
      <tr>
        <td colspan="3" style="color:#64748b;">本期沒有扣款項目</td>
      </tr>
    """

    html = f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>薪資單 - {employee.full_name} - {payroll.payroll_month}</title>
  <style>
    body {{
      margin: 0;
      padding: 32px;
      background: #f8fafc;
      color: #0f172a;
      font-family: "Microsoft JhengHei", "PingFang TC", sans-serif;
    }}
    .sheet {{
      max-width: 920px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
    }}
    .brand {{
      color: #0f766e;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 8px 0 4px;
      font-size: 30px;
    }}
    .muted {{
      color: #64748b;
      font-size: 14px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin: 24px 0;
    }}
    .card {{
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
    }}
    .card strong {{
      display: block;
      margin-top: 6px;
      font-size: 22px;
    }}
    .section {{
      margin-top: 28px;
    }}
    .section h2 {{
      margin: 0 0 12px;
      font-size: 19px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
    }}
    th, td {{
      padding: 12px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 14px;
    }}
    th {{
      color: #475569;
      text-align: left;
      background: #f8fafc;
    }}
    .formula {{
      background: #f8fafc;
      border-radius: 14px;
      padding: 14px 16px;
      margin-top: 10px;
      font-size: 14px;
    }}
    @media print {{
      body {{
        background: #fff;
        padding: 0;
      }}
      .sheet {{
        box-shadow: none;
        border: none;
        max-width: none;
        padding: 0;
      }}
    }}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">Hong Kong SME HR</div>
    <h1>薪資單</h1>
    <div class="muted">月份：{payroll.payroll_month}</div>

    <div class="grid">
      <div class="card">
        <div class="muted">員工姓名</div>
        <strong>{employee.full_name}</strong>
        <div class="muted">員工編號：{employee.employee_no}</div>
      </div>
      <div class="card">
        <div class="muted">部門 / 職位</div>
        <strong>{employee.department} / {employee.job_title}</strong>
        <div class="muted">入職日期：{employee.employment_start_date}</div>
      </div>
      <div class="card">
        <div class="muted">總收入</div>
        <strong>HK${payroll.gross_income:.2f}</strong>
      </div>
      <div class="card">
        <div class="muted">淨薪</div>
        <strong>HK${payroll.net_salary:.2f}</strong>
      </div>
    </div>

    <div class="section">
      <h2>收入拆解</h2>
      <table>
        <thead>
          <tr>
            <th>項目</th>
            <th>說明</th>
            <th style="text-align:right;">金額</th>
          </tr>
        </thead>
        <tbody>{earnings_rows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>扣款拆解</h2>
      <table>
        <thead>
          <tr>
            <th>項目</th>
            <th>說明</th>
            <th style="text-align:right;">金額</th>
          </tr>
        </thead>
        <tbody>{deductions_rows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>薪資摘要</h2>
      <table>
        <tbody>
          <tr><td>有關入息</td><td style="text-align:right;">HK${payroll.relevant_income:.2f}</td></tr>
          <tr><td>僱員 MPF</td><td style="text-align:right;">HK${payroll.employee_mpf:.2f}</td></tr>
          <tr><td>僱主 MPF</td><td style="text-align:right;">HK${payroll.employer_mpf:.2f}</td></tr>
          <tr><td><strong>淨薪</strong></td><td style="text-align:right;"><strong>HK${payroll.net_salary:.2f}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>計算公式</h2>
      <div class="formula">有關入息：{formulas['relevant_income_formula']}</div>
      <div class="formula">僱員 MPF：{formulas['employee_mpf_formula']}</div>
      <div class="formula">僱主 MPF：{formulas['employer_mpf_formula']}</div>
      <div class="formula">淨薪：{formulas['net_salary_formula']}</div>
    </div>
  </div>
</body>
</html>
"""
    return html.encode("utf-8")
