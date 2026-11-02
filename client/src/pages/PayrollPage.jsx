import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import PrintablePayslip from "../components/PrintablePayslip";

export default function PayrollPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [activeTab, setActiveTab] = useState(role === "faculty" ? "my-payslips" : "payslips");
  const [structures, setStructures] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [selectedPayslipForPrint, setSelectedPayslipForPrint] = useState(null);

  // Configure Structure Form State
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [basicPay, setBasicPay] = useState(75000);
  const [hra, setHra] = useState(15000);
  const [da, setDa] = useState(7500);
  const [specialAllowance, setSpecialAllowance] = useState(5000);
  const [pfDeduction, setPfDeduction] = useState(6000);
  const [taxDeduction, setTaxDeduction] = useState(5000);
  const [otherDeductions, setOtherDeductions] = useState(1000);
  const [bankAccount, setBankAccount] = useState("");
  const [panNumber, setPanNumber] = useState("");

  // Batch Generation Form State
  const [genMonth, setGenMonth] = useState("November");
  const [genMonthNumber, setGenMonthNumber] = useState(11);
  const [genYear, setGenYear] = useState(2026);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadData = () => {
    if (["admin", "principal"].includes(role)) {
      api.get("/api/payroll/structures")
        .then((res) => setStructures(res.structures || []))
        .catch((err) => console.error(err));

      api.get("/api/payroll/payslips")
        .then((res) => setPayslips(res.payslips || []))
        .catch((err) => console.error(err));

      api.get("/api/faculty")
        .then((res) => {
          setFacultyList(res.faculty || []);
          if (res.faculty && res.faculty.length > 0) {
            setSelectedFacultyId(res.faculty[0]._id);
          }
        })
        .catch((err) => console.error(err));
    }

    if (role === "faculty") {
      api.get("/api/payroll/my-payslips")
        .then((res) => setMyPayslips(res.payslips || []))
        .catch((err) => console.error(err));
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/payroll/structure", {
        facultyId: selectedFacultyId,
        basicPay,
        hra,
        da,
        specialAllowance,
        pfDeduction,
        taxDeduction,
        otherDeductions,
        bankAccount,
        panNumber,
      });

      setAlert({ type: "success", message: res.message });
      loadData();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthly = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/payroll/generate-monthly", {
        month: genMonth,
        monthNumber: Number(genMonthNumber),
        year: Number(genYear),
      });

      setAlert({ type: "success", message: res.message });
      loadData();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const calculatedNet =
    Number(basicPay) +
    Number(hra) +
    Number(da) +
    Number(specialAllowance) -
    (Number(pfDeduction) + Number(taxDeduction) + Number(otherDeductions));

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Faculty Payroll & Payslip Management</h2>
          <p className="erp-page-subtitle">
            Configure salary structures, process monthly payments, and issue verifiable payslips.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        {role === "faculty" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "my-payslips" ? "active" : ""}`}
              onClick={() => setActiveTab("my-payslips")}
            >
              <i className="bi-cash-stack me-1"></i> My Payslips
            </button>
          </li>
        )}

        {["admin", "principal"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "payslips" ? "active" : ""}`}
              onClick={() => setActiveTab("payslips")}
            >
              <i className="bi-receipt-cutoff me-1"></i> Generated Payslips ({payslips.length})
            </button>
          </li>
        )}

        {["admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "generate" ? "active" : ""}`}
              onClick={() => setActiveTab("generate")}
            >
              <i className="bi-gear-wide-connected me-1"></i> Run Monthly Payroll Batch
            </button>
          </li>
        )}

        {["admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "structures" ? "active" : ""}`}
              onClick={() => setActiveTab("structures")}
            >
              <i className="bi-sliders me-1"></i> Configure Salary Structures
            </button>
          </li>
        )}
      </ul>

      {/* 1. Faculty View My Payslips */}
      {activeTab === "my-payslips" && role === "faculty" && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title"><i className="bi-file-earmark-pdf-fill text-danger"></i> My Monthly Salary Slips</h5>
          </div>
          <div className="erp-card-body p-0">
            {myPayslips.length === 0 ? (
              <div className="text-center py-5 text-muted">No payslips generated yet for your account.</div>
            ) : (
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Month & Year</th>
                      <th>Basic Pay</th>
                      <th>Gross Salary</th>
                      <th>Deductions</th>
                      <th>Net Disbursed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPayslips.map((p) => (
                      <tr key={p._id}>
                        <td className="fw-bold">{p.month} {p.year}</td>
                        <td>₹{p.basicPay?.toLocaleString()}</td>
                        <td className="text-success fw-semibold">₹{p.grossSalary?.toLocaleString()}</td>
                        <td className="text-danger fw-semibold">₹{p.totalDeductions?.toLocaleString()}</td>
                        <td className="fw-bold text-primary fs-6">₹{p.netSalary?.toLocaleString()}</td>
                        <td><span className="badge bg-success">Paid</span></td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelectedPayslipForPrint(p)}
                          >
                            <i className="bi-eye-fill me-1"></i> View & Print Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Admin & Principal Generated Payslips */}
      {activeTab === "payslips" && ["admin", "principal"].includes(role) && (
        <div className="erp-card">
          <div className="erp-card-header flex-wrap gap-2">
            <h5 className="erp-card-title mb-0">College Monthly Payslip Registry</h5>
            <span className="badge bg-light text-dark border">Total Records: {payslips.length}</span>
          </div>
          <div className="erp-card-body p-0">
            {payslips.length === 0 ? (
              <div className="text-center py-5 text-muted">No payslips generated yet. Run the payroll batch to disburse monthly salaries.</div>
            ) : (
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Department</th>
                      <th>Month & Year</th>
                      <th>Gross Pay</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Payment Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((p) => (
                      <tr key={p._id}>
                        <td className="fw-bold">
                          {p.facultyId?.name}
                          <small className="d-block text-muted">{p.facultyId?.employeeId}</small>
                        </td>
                        <td>{p.facultyId?.department}</td>
                        <td>{p.month} {p.year}</td>
                        <td className="text-success fw-semibold">₹{p.grossSalary?.toLocaleString()}</td>
                        <td className="text-danger">₹{p.totalDeductions?.toLocaleString()}</td>
                        <td className="fw-bold text-primary">₹{p.netSalary?.toLocaleString()}</td>
                        <td>{p.paymentDate}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelectedPayslipForPrint(p)}
                          >
                            <i className="bi-printer-fill me-1"></i> View Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Run Monthly Payroll Batch */}
      {activeTab === "generate" && role === "admin" && (
        <div className="row g-4 justify-content-center">
          <div className="col-lg-6">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-cpu-fill text-primary"></i> Run Monthly Payroll Batch</h5>
              </div>
              <div className="erp-card-body">
                <p className="text-muted small">
                  This process calculates gross earnings, applies standard PF and tax deductions, computes net salary, and generates official downloadable PDF payslips for all active faculty with an established salary structure.
                </p>
                <form onSubmit={handleGenerateMonthly}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Salary Month</label>
                    <select
                      className="form-select"
                      value={genMonth}
                      onChange={(e) => {
                        setGenMonth(e.target.value);
                        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        setGenMonthNumber(months.indexOf(e.target.value) + 1);
                      }}
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">Year</label>
                    <input
                      type="number"
                      className="form-control"
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="alert alert-info py-2 small">
                    <i className="bi-info-circle me-1"></i> <strong>{structures.length}</strong> faculty salary structures will be processed. Duplicate entries for the same month are automatically prevented.
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading || structures.length === 0}
                  >
                    <i className="bi-check-all"></i> {loading ? "Processing Batch..." : `Generate & Issue ${genMonth} ${genYear} Payslips`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Configure Salary Structures */}
      {activeTab === "structures" && role === "admin" && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-cash text-success"></i> Salary Component Setup</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleSaveStructure}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Select Faculty Member</label>
                    <select
                      className="form-select"
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      required
                    >
                      {facultyList.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name} ({f.employeeId} - {f.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Basic Pay (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={basicPay}
                        onChange={(e) => setBasicPay(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">HRA (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={hra}
                        onChange={(e) => setHra(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">DA (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={da}
                        onChange={(e) => setDa(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Special Allowance (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={specialAllowance}
                        onChange={(e) => setSpecialAllowance(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <h6 className="fw-bold text-danger border-bottom pb-1 small mt-3">Monthly Deductions:</h6>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">PF Deduction (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={pfDeduction}
                        onChange={(e) => setPfDeduction(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Income Tax / TDS (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={taxDeduction}
                        onChange={(e) => setTaxDeduction(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Computed Net Pill */}
                  <div className="p-3 bg-light rounded border mb-3 d-flex justify-content-between align-items-center">
                    <span className="small text-muted fw-bold">Computed Net Monthly Salary:</span>
                    <span className="fw-extrabold text-primary fs-5">₹{calculatedNet.toLocaleString()}</span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading}
                  >
                    Save Salary Structure
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title">Configured Salary Structures</h5>
              </div>
              <div className="erp-card-body p-0">
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Faculty</th>
                        <th>Dept</th>
                        <th>Basic</th>
                        <th>Gross</th>
                        <th>Deductions</th>
                        <th>Net Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structures.map((s) => {
                        const gross = s.basicPay + s.hra + s.da + s.specialAllowance;
                        const ded = s.pfDeduction + s.taxDeduction + s.otherDeductions;
                        return (
                          <tr key={s._id}>
                            <td className="fw-bold">{s.facultyId?.name}</td>
                            <td>{s.facultyId?.department}</td>
                            <td>₹{s.basicPay?.toLocaleString()}</td>
                            <td className="text-success fw-semibold">₹{gross.toLocaleString()}</td>
                            <td className="text-danger">₹{ded.toLocaleString()}</td>
                            <td className="fw-bold text-primary">₹{s.netSalary?.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {selectedPayslipForPrint && (
        <PrintablePayslip
          payslip={selectedPayslipForPrint}
          onClose={() => setSelectedPayslipForPrint(null)}
        />
      )}
    </div>
  );
}
