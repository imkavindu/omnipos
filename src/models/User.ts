import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'KIOSK' | 'KITCHEN';

export interface IUser extends Document {
  name: string;
  email: string;
  pinCode?: string; // bcrypt hash of 4-digit PIN for store staff
  passwordHash?: string; // bcrypt hash of password for SUPER_ADMIN
  role: UserRole;
  storeId?: string | null; // null for SUPER_ADMIN with global oversight
  avatar?: string;
  mustChangePin?: boolean; // Force PIN change on initial login (for newly onboarded managers)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    pinCode: { type: String, default: null },
    passwordHash: { type: String, default: null },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER', 'KIOSK', 'KITCHEN'],
      default: 'CASHIER',
    },
    storeId: { type: String, default: null, index: true },
    avatar: { type: String, default: '' },
    mustChangePin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
