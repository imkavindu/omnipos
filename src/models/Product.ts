import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  storeId: string; // Tenant isolation key
  name: string;
  category: string;
  price: number;
  costPrice: number;
  sku: string;
  barcode: string;
  image: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isTaxable: boolean;
  kitchenCategory: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema<IProduct>(
  {
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, required: true, trim: true, index: true },
    image: { type: String, default: '' },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    isTaxable: { type: Boolean, default: true },
    kitchenCategory: {
      type: String,
      enum: ['GRILL', 'BAR', 'BAKERY', 'DELI', 'RETAIL'],
      default: 'RETAIL',
    },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index for unique barcode per store
ProductSchema.index({ storeId: 1, barcode: 1 });
ProductSchema.index({ storeId: 1, category: 1 });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
