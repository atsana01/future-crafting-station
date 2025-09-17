import { supabase } from '@/integrations/supabase/client';

// Input validation utility
export const validateInput = (input: string, maxLength: number = 1000): boolean => {
  if (!input || typeof input !== 'string') return false;
  
  // Basic XSS prevention
  const xssPattern = /<script|javascript:|data:|vbscript:|on\w+=/i;
  if (xssPattern.test(input)) return false;
  
  // SQL injection prevention (basic patterns)
  const sqlPattern = /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i;
  if (sqlPattern.test(input)) return false;
  
  // Length check
  if (input.length > maxLength) return false;
  
  return true;
};

// Sanitize text input
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .substring(0, 1000); // Limit length
};

// Log security events
export const logSecurityEvent = async (
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    await supabase.rpc('log_security_event', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_metadata: metadata
    });
  } catch (error) {
    console.warn('Failed to log security event:', error);
  }
};

// Validate file uploads
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large (max 5MB)' };
  }
  
  return { valid: true };
};

// Secure file upload to Supabase Storage
export const secureFileUpload = async (
  file: File,
  folder: string = 'general'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const fileName = `${user.id}/${folder}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('secure-uploads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      await logSecurityEvent('file_upload_failed', 'storage', undefined, {
        error: error.message,
        fileName: file.name,
        fileSize: file.size
      });
      return { success: false, error: error.message };
    }
    
    await logSecurityEvent('file_uploaded', 'storage', undefined, {
      fileName: file.name,
      fileSize: file.size,
      path: data.path
    });
    
    const { data: urlData } = supabase.storage
      .from('secure-uploads')
      .getPublicUrl(data.path);
    
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    return { success: false, error: 'Upload failed' };
  }
};

// Rate limiting utility (client-side basic implementation)
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(private maxAttempts: number = 5, private windowMs: number = 60000) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}

export const authRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute