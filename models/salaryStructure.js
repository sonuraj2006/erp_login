const mongoose = require("mongoose");

const salaryStructureSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      unique: true,
    },
    basicPay: {
      type: Number,
      required: true,
      min: 0,
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
    netSalary: {
      type: Number,
      required: true,
    },
    bankAccount: {
      type: String,
      default: "",
    },
    panNumber: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
