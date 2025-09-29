import { z } from 'zod';

// Enhanced input validation schemas
export const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  message: z.string()
    .trim()
    .min(1, "Message is required")
    .max(2000, "Message must be less than 2000 characters")
});

export const profileUpdateSchema = z.object({
  full_name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  
  phone_number: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  
  company_name: z.string()
    .trim()
    .max(200, "Company name must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  
  address: z.string()
    .trim()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal(""))
});

export const projectFormSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Project title is required")
    .max(200, "Title must be less than 200 characters"),
  
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  
  location: z.string()
    .trim()
    .min(1, "Location is required")
    .max(200, "Location must be less than 200 characters"),
  
  budget_range: z.string()
    .min(1, "Budget range is required"),
  
  timeline: z.string()
    .min(1, "Timeline is required")
});

export const messageSchema = z.object({
  message_content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters")
});

// Utility functions for validation
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

export const validateFileUpload = (file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.php$/i,
    /\.exe$/i,
    /\.sh$/i,
    /\.bat$/i,
    /\.scr$/i,
    /script/i,
    /<script/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return { valid: false, error: 'File name contains suspicious content' };
  }
  
  return { valid: true };
};