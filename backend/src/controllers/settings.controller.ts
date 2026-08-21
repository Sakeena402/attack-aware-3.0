import { User } from '../models/User.js';

interface SettingsUserPayload {
  email: string;
  role: string;
  [key: string]: any;
}

export const getSettings = async (user: SettingsUserPayload) => {
  console.log("USER OBJECT:", user);
  
  // ✅ Find by email instead of id (more reliable)
  const dbUser = await User.findOne({ email: user.email }).select('-passwordHash');
  if (!dbUser) throw new Error('User not found');
  
  return {
    role: dbUser.role,
    theme: 'dark',
    notifications: true,
    twoFactorAuth: false,
    name: dbUser.name,
    email: dbUser.email,
    department: dbUser.department,
    phoneNumber: dbUser.phoneNumber,
  };
};

export const updateSettings = async (user: SettingsUserPayload, body: any) => {
  const { theme, notifications, twoFactorAuth, name, email, phoneNumber, department } = body;
  
  // ✅ Find by email instead of id
  const dbUser = await User.findOne({ email: user.email });
  if (!dbUser) throw new Error('User not found');

  if (name) dbUser.name = name;
  if (email) dbUser.email = email;
  if (phoneNumber) dbUser.phoneNumber = phoneNumber;

  if (user.role === 'admin' || user.role === 'super_admin') {
    if (department) dbUser.department = department;
  }

  await dbUser.save();

  return {
    role: dbUser.role,
    theme: theme ?? 'dark',
    notifications: notifications ?? true,
    twoFactorAuth: twoFactorAuth ?? false,
    name: dbUser.name,
    email: dbUser.email,
    department: dbUser.department,
    phoneNumber: dbUser.phoneNumber,
  };
};
