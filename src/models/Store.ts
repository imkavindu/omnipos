import mongoose, { Schema, Document, Model } from 'mongoose';

export type PlanTier = 'starter' | 'growth' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due';

export interface IStore extends Document {
  code: string;
  name: string;
  type: 'restaurant' | 'retail';
  address: string;
  phone: string;
  currency: string;
  currencySymbol: string;
  taxRate: number; // e.g. 8.25 for 8.25%
  receiptHeader: string;
  receiptFooter: string;
  ownerName: string;
  ownerEmail: string;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  monthlyFee: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema<IStore>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['restaurant', 'retail'], default: 'retail' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    taxRate: { type: Number, default: 8.0 },
    receiptHeader: { type: String, default: 'Thank you for shopping with us!' },
    receiptFooter: { type: String, default: 'Please visit us again soon.' },
    ownerName: { type: String, default: 'Shop Owner' },
    ownerEmail: { type: String, default: 'owner@business.com' },
    planTier: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      default: 'growth',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'past_due'],
      default: 'active',
    },
    monthlyFee: { type: Number, default: 99.0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);
