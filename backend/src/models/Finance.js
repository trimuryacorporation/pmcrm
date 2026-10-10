import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    payeeType: { type: String, enum: ['Vendor', 'Freelancer', 'Employee'], required: true },
    payeeName: { type: String, required: true },
    transactionId: { type: String, trim: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    dueDate: Date,
    paidDate: Date,
    notes: String
  },
  { timestamps: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ['Payable', 'Receivable'], default: 'Payable', index: true },
    salesDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales_deals', index: true },
    currency: { type: String, enum: ['INR','USD','EUR','GBP'], default: 'INR' },
    amountPaid: { type: Number, min: 0, default: 0 },
    paymentReference: String,
    invoiceNumber: { type: String, required: true, unique: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    payeeName: { type: String, required: true },
    transactionId: { type: String, trim: true },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    invoiceDate: Date,
    dueDate: Date,
    paymentDate: Date,
    notes: String,
    file: { name: String, url: String }
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
