import mongoose from 'mongoose';

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    reservedStock: { type: Number, required: true, default: 0, min: 0 },
    description: { type: String, default: '' },
    specs: { type: Schema.Types.Mixed, default: {} },
    imageId: { type: Schema.Types.ObjectId, ref: 'Image', default: null },
    image: { type: String, default: null },
    images: { type: [String], default: [] },
    externalId: { type: Number, default: null },
    externalSource: { type: String, default: null },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);

productSchema.index({ categoryId: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
