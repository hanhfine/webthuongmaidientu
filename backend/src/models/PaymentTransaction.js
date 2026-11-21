import mongoose from 'mongoose';

const { Schema } = mongoose;

const safeIntValidator = {
  validator: (v) => Number.isSafeInteger(v) && v >= 0,
  message: '{PATH} must be a non-negative integer VND amount',
};

const paymentTransactionSchema = new Schema(
  {
    providerTxnId: { type: String, required: true, unique: true },
    provider: { type: String, default: 'sepay' },
    source: { type: String, enum: ['webhook', 'reconcile_cron'], required: true },
    gateway: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    transferType: { type: String, enum: ['in', 'out'], required: true },
    transferAmount: { type: Number, required: true, min: 0, validate: safeIntValidator },
    content: { type: String, default: '' },
    extractedOrderCode: { type: String, default: null },
    referenceCode: { type: String, default: '' },
    transactionDate: { type: Date, default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    matchStatus: {
      type: String,
      enum: [
        'MATCHED_PAID',
        'MATCHED_PARTIAL',
        'MATCHED_OVERPAID',
        'LATE_RECOVERED',
        'LATE_NEED_REFUND',
        'UNMATCHED',
        'IGNORED_OUTGOING',
        'ALREADY_SETTLED',
      ],
      required: true,
    },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'payment_transactions' },
);

paymentTransactionSchema.index({ orderId: 1, processedAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
