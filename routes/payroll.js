const express = require("express");
const SalaryStructure = require("../models/salaryStructure");
const Payslip = require("../models/payslip");
const Faculty = require("../models/faculty");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();
router.use(authMiddleware);

// 1. Get all salary structures (Admin, Principal)
router.get("/structures", requireRole("admin", "principal"), async (req, res) => {
  try {
    const structures = await SalaryStructure.find()
      .populate("facultyId", "name employeeId email department designation");
    return res.json({ structures });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch salary structures." });
  }
});

// 2. Set/Update salary structure for a faculty member (Admin only)
router.post("/structure", requireRole("admin"), async (req, res) => {
  try {
    const {
      facultyId,
      basicPay,
      hra = 0,
      da = 0,
      specialAllowance = 0,
      pfDeduction = 0,
      taxDeduction = 0,
      otherDeductions = 0,
      bankAccount,
      panNumber,
    } = req.body;

    if (!facultyId || basicPay === undefined) {
      return res.status(400).json({ message: "Faculty ID and basic pay are required." });
    }

    const gross = Number(basicPay) + Number(hra) + Number(da) + Number(specialAllowance);
    const totalDeductions = Number(pfDeduction) + Number(taxDeduction) + Number(otherDeductions);
    const netSalary = Math.max(0, gross - totalDeductions);

    let structure = await SalaryStructure.findOne({ facultyId });
    if (!structure) {
      structure = new SalaryStructure({
        facultyId,
        basicPay: Number(basicPay),
        hra: Number(hra),
        da: Number(da),
        specialAllowance: Number(specialAllowance),
        pfDeduction: Number(pfDeduction),
        taxDeduction: Number(taxDeduction),
        otherDeductions: Number(otherDeductions),
        netSalary,
        bankAccount: bankAccount || "",
        panNumber: panNumber || "",
      });
    } else {
      structure.basicPay = Number(basicPay);
      structure.hra = Number(hra);
      structure.da = Number(da);
      structure.specialAllowance = Number(specialAllowance);
      structure.pfDeduction = Number(pfDeduction);
      structure.taxDeduction = Number(taxDeduction);
      structure.otherDeductions = Number(otherDeductions);
      structure.netSalary = netSalary;
      if (bankAccount) structure.bankAccount = bankAccount;
      if (panNumber) structure.panNumber = panNumber;
    }

    await structure.save();

    await logAudit(req, "CONFIGURE_SALARY_STRUCTURE", "SalaryStructure", structure._id, {
      facultyId,
      netSalary,
    });

    return res.status(200).json({
      message: "Salary structure configured successfully.",
      structure,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to configure salary." });
  }
});

// 3. Generate monthly payslips for all faculty or selected faculty (Admin only)
router.post("/generate-monthly", requireRole("admin"), async (req, res) => {
  try {
    const { month, monthNumber, year } = req.body;
    if (!month || !monthNumber || !year) {
      return res.status(400).json({ message: "Month, monthNumber (1-12), and year are required." });
    }

    const structures = await SalaryStructure.find().populate("facultyId");
    let generatedCount = 0;
    let skippedCount = 0;

    for (const struct of structures) {
      if (!struct.facultyId) continue;

      const existing = await Payslip.findOne({
        facultyId: struct.facultyId._id,
        monthNumber: Number(monthNumber),
        year: Number(year),
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const grossSalary = struct.basicPay + struct.hra + struct.da + struct.specialAllowance;
      const totalDeductions = struct.pfDeduction + struct.taxDeduction + struct.otherDeductions;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      await Payslip.create({
        facultyId: struct.facultyId._id,
        month,
        monthNumber: Number(monthNumber),
        year: Number(year),
        basicPay: struct.basicPay,
        hra: struct.hra,
        da: struct.da,
        specialAllowance: struct.specialAllowance,
        grossSalary,
        pfDeduction: struct.pfDeduction,
        taxDeduction: struct.taxDeduction,
        otherDeductions: struct.otherDeductions,
        totalDeductions,
        netSalary,
        paymentStatus: "Paid",
        paymentDate: new Date().toISOString().split("T")[0],
        generatedBy: req.user.sub,
      });

      generatedCount++;
    }

    await logAudit(req, "GENERATE_PAYSLIPS", "Payslip", "", {
      month,
      year,
      generatedCount,
    });

    return res.json({
      message: `Payslips generated for ${month} ${year}: ${generatedCount} processed, ${skippedCount} already existed.`,
      generatedCount,
      skippedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to generate monthly payslips." });
  }
});

// 4. List all payslips (Admin, Principal)
router.get("/payslips", requireRole("admin", "principal"), async (req, res) => {
  try {
    const { monthNumber, year, facultyId } = req.query;
    const filter = {};
    if (monthNumber && monthNumber !== "all") filter.monthNumber = Number(monthNumber);
    if (year && year !== "all") filter.year = Number(year);
    if (facultyId) filter.facultyId = facultyId;

    const payslips = await Payslip.find(filter)
      .populate("facultyId", "name employeeId email department designation")
      .sort({ year: -1, monthNumber: -1 });

    return res.json({ payslips });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch payslips." });
  }
});

// 5. Get logged-in faculty member's own payslips
router.get("/my-payslips", async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found." });
    }

    const payslips = await Payslip.find({ facultyId: faculty._id })
      .populate("facultyId", "name employeeId department designation")
      .sort({ year: -1, monthNumber: -1 });

    const salaryStructure = await SalaryStructure.findOne({ facultyId: faculty._id });

    return res.json({ payslips, salaryStructure });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch your payslips." });
  }
});

// 6. Get single payslip for print / PDF download
router.get("/payslips/:id", async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate("facultyId", "name employeeId email department designation phone joiningDate");

    if (!payslip) return res.status(404).json({ message: "Payslip not found." });

    // Authorization check: Admin, Principal, or own faculty
    if (req.user.role === "faculty") {
      const myFac = await Faculty.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });
      if (!myFac || String(myFac._id) !== String(payslip.facultyId._id)) {
        return res.status(403).json({ message: "Access denied to this payslip." });
      }
    }

    return res.json({ payslip });
  } catch (err) {
    return res.status(500).json({ message: "Failed to retrieve payslip." });
  }
});

module.exports = router;
