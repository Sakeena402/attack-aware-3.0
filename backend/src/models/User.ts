import { Schema, model, Types } from 'mongoose';
import { IUser } from '../types/index.js';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'employee'],
      default: 'employee',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    department: {
      type: String,
      default: 'General',
    },
    points: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 });
userSchema.index({ companyId: 1 });

export const User = model<IUser>('User', userSchema);





// import { Schema, model, Types } from 'mongoose';
// import { IUser } from '../types/index.js';

// const userSchema = new Schema<IUser>(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     passwordHash: {
//       type: String,
//       required: true,
//     },
//     role: {
//       type: String,
//       enum: ['super_admin', 'admin', 'employee'],
//       default: 'employee',
//     },
//     companyId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Company',
//       required: false,
//     },
//     department: {
//       type: String,
//       default: 'General',
//     },
//     points: {
//       type: Number,
//       default: 0,
//     },
//     badges: {
//       type: [String],
//       default: [],
//     },
//     lastLogin: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// userSchema.index({ email: 1 });
// userSchema.index({ companyId: 1 });

// export const User = model<IUser>('User', userSchema);
