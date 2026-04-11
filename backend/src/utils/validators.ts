import validator from 'validator';

export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

export const validatePassword = (password: string): boolean => {
  return password && password.length >= 6;
};

export const validateName = (name: string): boolean => {
  return name && name.trim().length >= 2;
};

export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== "string") {
    console.log("Invalid email received:", email);
    return "";
  }
  return email.toLowerCase().trim();
};

export const validateLoginRequest = (
  email: string,
  password: string
): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  if (!validateEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  return { valid: true };
};

export const validateRegisterRequest = (
  name: string,
  email: string,
  password: string
): { valid: boolean; error?: string } => {
  if (!validateName(name)) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (!validateEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (!validatePassword(password)) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};
