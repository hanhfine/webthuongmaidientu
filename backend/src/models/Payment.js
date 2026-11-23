import mongoose from 'mongoose';

const { Schema } = mongoose;

const safeIntValidator = {
  validator: (v) => Number.isSafeInteger(v) && v >= 0,
  message: '{PATH} must be a non-negative integer VND amount',
};

const nullableIntValidator = {
  validator: (v) => v === null || v === undefined || (Number.isSafeInteger(v) && v >= 0),
  message: '{PATH} must be null or a non-negative integer VND amount',
};

const stateHistoryEntrySchema = new Schema(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    reason: { type: String, required: true },
    actor: { type: String, required: true },
    providerTxnId: { type: String, default: null },
    amount: { type: Number, default: null, validate: nullableIntValidator },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    orderCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['sepay'], default: 'sepay' },
    expectedAmount: { type: Number, required: true, min: 0, validate: safeIntValidator },
    paidAmount: { type: Number, required: true, default: 0, min: 0, validate: safeIntValidator },
    overpaidAmount: { type: Number, required: true, default: 0, min: 0, validate: safeIntValidator },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'NEED_REFUND', 'REFUNDED'],
      required: true,
      default: 'PENDING_PAYMENT',
    },
    expiresAt: { type: Date, required: true },
    partialGraceExpiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundNote: { type: String, default: '' },
    recoveredFromCancelled: { type: Boolean, default: false },
    stateHistory: { type: [stateHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ status: 1, partialGraceExpiresAt: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
