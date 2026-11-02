import React from "react";

export default function PrintablePayslip({ payslip, onClose }) {
  if (!payslip) return null;

  const fac = payslip.facultyId || {};

  return (
    <div className="erp-modal-backdrop" onClick={onClose}>
      <div
        className="erp-modal-content"
        style={{ maxWidth: 850 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom no-print">
          <h5 className="mb-0 fw-bold">Official Salary Payslip</h5>
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <i className="bi-printer-fill me-1"></i> Print / Save PDF
            </button>
            <button className="btn btn-light btn-sm rounded-circle" onClick={onClose}>
              <i className="bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div className="p-4 payslip-container">
          {/* Header */}
          <div className="text-center border-bottom pb-3 mb-4">
            <h3 className="fw-extrabold text-primary mb-1">APEX INSTITUTE OF TECHNOLOGY & SCIENCE</h3>
            <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
              Affiliated to State University | Approved by AICTE, New Delhi
            </p>
            <div className="badge bg-dark px-3 py-2 text-uppercase letter-spacing-1">
              Salary Payslip - {payslip.month} {payslip.year}
            </div>
          </div>

          {/* Employee Details Grid */}
          <div className="row g-3 mb-4" style={{ fontSize: "0.88rem" }}>
            <div className="col-6">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted fw-semibold">Employee ID:</td>
                    <td className="fw-bold">{fac.employeeId || "EMP-001"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Faculty Name:</td>
                    <td className="fw-bold">{fac.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Department:</td>
                    <td>{fac.department}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Designation:</td>
                    <td>{fac.designation}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="col-6">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted fw-semibold">Pay Period:</td>
                    <td className="fw-bold">{payslip.month} {payslip.year}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Payment Date:</td>
                    <td>{payslip.paymentDate}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Payment Status:</td>
                    <td>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        {payslip.paymentStatus}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-semibold">Mode:</td>
                    <td>Direct Bank Transfer (NEFT)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="row g-3 mb-4">
            {/* Earnings */}
            <div className="col-6">
              <div className="card h-100 border">
                <div className="card-header bg-light py-2 fw-bold text-success">
                  <i className="bi-plus-circle me-1"></i> Earnings (INR)
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-striped mb-0">
                    <tbody>
                      <tr>
                        <td>Basic Pay</td>
                        <td className="text-end fw-semibold">₹{payslip.basicPay?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td className="text-end fw-semibold">₹{payslip.hra?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Dearness Allowance (DA)</td>
                        <td className="text-end fw-semibold">₹{payslip.da?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Special Allowance</td>
                        <td className="text-end fw-semibold">₹{payslip.specialAllowance?.toLocaleString()}</td>
                      </tr>
                    </tbody>
                    <tfoot className="table-light">
                      <tr className="fw-bold">
                        <td>Gross Earnings</td>
                        <td className="text-end text-success">₹{payslip.grossSalary?.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="col-6">
              <div className="card h-100 border">
                <div className="card-header bg-light py-2 fw-bold text-danger">
                  <i className="bi-dash-circle me-1"></i> Deductions (INR)
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-striped mb-0">
                    <tbody>
                      <tr>
                        <td>Provident Fund (PF)</td>
                        <td className="text-end fw-semibold">₹{payslip.pfDeduction?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Professional Tax (PT) / TDS</td>
                        <td className="text-end fw-semibold">₹{payslip.taxDeduction?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Other Deductions</td>
                        <td className="text-end fw-semibold">₹{payslip.otherDeductions?.toLocaleString()}</td>
                      </tr>
                    </tbody>
                    <tfoot className="table-light">
                      <tr className="fw-bold">
                        <td>Total Deductions</td>
                        <td className="text-end text-danger">₹{payslip.totalDeductions?.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="p-3 rounded-3 bg-light border border-2 border-primary d-flex justify-content-between align-items-center mb-4">
            <div>
              <span className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: "0.75rem" }}>
                Net Salary Payable
              </span>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Gross Earnings - Total Deductions
              </span>
            </div>
            <div className="text-end">
              <h2 className="text-primary fw-extrabold mb-0">
                ₹{payslip.netSalary?.toLocaleString()}
              </h2>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="row text-center pt-5 mt-5 border-top">
            <div className="col-4">
              <div className="border-top pt-2 text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
                Employee Signature
              </div>
            </div>
            <div className="col-4">
              <div className="border-top pt-2 text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
                Finance Officer
              </div>
            </div>
            <div className="col-4">
              <div className="border-top pt-2 text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
                Principal / Registrar
              </div>
            </div>
          </div>
          <div className="text-center text-muted mt-4" style={{ fontSize: "0.7rem" }}>
            * This is a computer-generated salary slip and requires no physical seal if verified electronically.
          </div>
        </div>
      </div>
    </div>
  );
}
