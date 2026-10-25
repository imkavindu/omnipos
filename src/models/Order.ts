import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  quantity: number;
  notes?: string;
  kitchenCategory?: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'RETAIL_SALE' | 'KIOSK_SELF';
export type PaymentMethod = 'CASH' | 'CARD' | 'KIOSK_DIGITAL' | 'SPLIT';
export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface IOrder extends Document {
  storeId: string; // Tenant isolation key
  orderNumber: string; // e.g., "ORD-1002" or "K-302"
  orderType: OrderType;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashTendered?: number;
  changeDue?: number;
  orderStatus: OrderStatus;
  customerName?: string;
  tableNumber?: string;
  cashierName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, default: '' },
    kitchenCategory: {
      type: String,
      enum: ['GRILL', 'BAR', 'BAKERY', 'DELI', 'RETAIL'],
      default: 'RETAIL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'],
      default: 'PENDING',
    },
  },
  { _id: false }
);

const OrderSchema: Schema = new Schema<IOrder>(
  {
    storeId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    orderType: {
      type: String,
      enum: ['DINE_IN', 'TAKEAWAY', 'RETAIL_SALE', 'KIOSK_SELF'],
      default: 'RETAIL_SALE',
    },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'FIXED' },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'KIOSK_DIGITAL', 'SPLIT'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'REFUNDED'],
      default: 'PAID',
    },
    cashTendered: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    customerName: { type: String, default: 'Guest' },
    tableNumber: { type: String, default: '' },
    cashierName: { type: String, default: 'Self / Cashier' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ storeId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
