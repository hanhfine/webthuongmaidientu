import mongoose from 'mongoose';

const { Schema } = mongoose;

const safeIntValidator = {
  validator: (v) => Number.isSafeInteger(v) && v >= 0,
  message: '{PATH} must be a non-negative integer VND amount',
};

const unmatchedTransactionSchema = new Schema(
  {
    providerTxnId: { type: String, required: true, unique: true },
    paymentTransactionId: { type: Schema.Types.ObjectId, ref: 'PaymentTransaction', required: true },
    amount: { type: Number, required: true, min: 0, validate: safeIntValidator },
    content: { type: String, default: '' },
    gateway: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    transactionDate: { type: Date, default: null },
    resolutionStatus: {
      type: String,
      enum: ['OPEN', 'RESOLVED_MATCHED', 'RESOLVED_REFUNDED', 'IGNORED'],
      default: 'OPEN',
    },
    resolvedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'unmatched_transactions' },
);

unmatchedTransactionSchema.index({ resolutionStatus: 1, createdAt: -1 });

export const UnmatchedTransaction = mongoose.model('UnmatchedTransaction', unmatchedTransactionSchema);
