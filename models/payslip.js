const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    month: {
      type: String, // e.g., "October"
      required: true,
    },
    monthNumber: {
      type: Number, // 1 to 12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    basicPay: {
      type: Number,
      required: true,
    },
    hra: {
      type: Number,
      default: 0,
    },
    da: {
      type: Number,
      default: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
      required: true,
    },
    pfDeduction: {
      type: Number,
      default: 0,
    },
    taxDeduction: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Processed", "Paid"],
      default: "Paid",
    },
    paymentDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    remarks: {
      type: String,
      default: "",
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

payslipSchema.index({ facultyId: 1, monthNumber: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payslip", payslipSchema);
