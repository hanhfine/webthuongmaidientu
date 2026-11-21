import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestKey: { type: String, required: true },
    orderCode: { type: String, unique: true, sparse: true },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, required: true },
    total: { type: Number, required: true },
    promotionCode: String,
    paymentMethod: { type: String, enum: ['cod', 'bank'], required: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'partially_paid', 'paid', 'need_refund', 'refunded'],
      required: true,
    },
    paymentExpiresAt: { type: Date, default: null },
    paidAmount: { type: Number, default: 0, min: 0 },
    overpaidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
      default: 'pending',
    },
    deliveredAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, requestKey: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1, deliveredAt: 1 });

export const Order = mongoose.model('Order', orderSchema);
