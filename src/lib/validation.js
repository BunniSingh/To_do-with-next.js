/**
 * Server-side validation utilities
 */

/**
 * Sanitize string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  // Remove potential script tags and dangerous HTML
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }
  
  return { valid: true };
}

/**
 * Validate user name
 * @param {string} name - Name to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
export function validateName(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 1) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  
  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name must not exceed 100 characters' };
  }
  
  return { valid: true, value: trimmedName };
}

/**
 * Validate todo text
 * @param {string} text - Todo text to validate
 * @returns {{ valid: boolean, error?: string, value?: string }} - Validation result
 */
export function validateTodoText(text) {
  if (typeof text !== 'string') {
    return { valid: false, error: 'Todo text must be a string' };
  }
  
  const trimmedText = sanitizeString(text).trim();
  
  if (trimmedText.length < 1) {
    return { valid: false, error: 'Todo text cannot be empty' };
  }
  
  if (trimmedText.length > 1000) {
    return { valid: false, error: 'Todo text must not exceed 1000 characters' };
  }
  
  return { valid: true, value: trimmedText };
}

/**
 * Validate message content
 * @param {string} content - Message content to validate
 * @returns {{ valid: boolean, error?: string, value?: string }} - Validation result
 */
export function validateMessageContent(content) {
  if (typeof content !== 'string') {
    return { valid: false, error: 'Message content must be a string' };
  }
  
  const sanitizedContent = sanitizeString(content).trim();
  
  if (sanitizedContent.length < 1) {
    return { valid: false, error: 'Message content cannot be empty' };
  }
  
  if (sanitizedContent.length > 5000) {
    return { valid: false, error: 'Message content must not exceed 5000 characters' };
  }
  
  return { valid: true, value: sanitizedContent };
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} - Whether ID is valid
 */
export function isValidObjectId(id) {
  if (typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}
