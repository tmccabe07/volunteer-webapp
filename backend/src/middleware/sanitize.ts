/**
 * Input Sanitization Middleware
 * 
 * Sanitizes user input to prevent XSS attacks and other injection vulnerabilities
 * 
 * This middleware strips potentially dangerous HTML/JavaScript from user input
 * while preserving safe content.
 * 
 * Usage:
 * - Applied globally in main.ts
 * - Can be applied to specific routes if needed
 * 
 * Note: This is a basic implementation. For production, consider using:
 * - DOMPurify for HTML sanitization
 * - validator.js for comprehensive input validation
 * - express-mongo-sanitize for NoSQL injection prevention (if using MongoDB)
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * List of dangerous patterns to remove from input
 * These patterns are commonly used in XSS attacks
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers (onclick, onload, etc.)
  /<iframe/gi, // iFrames
  /<object/gi, // Objects
  /<embed/gi, // Embeds
  /eval\(/gi, // eval() calls
  /expression\(/gi, // CSS expressions
  /<link/gi, // Link tags (can be used for CSS injection)
  /<meta/gi, // Meta tags
];

/**
 * Sanitize a string value by removing dangerous patterns
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;

  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a plain object in place.
 *
 * Express request.query is exposed through a getter-only property in newer
 * router implementations, so we must mutate its existing object instead of
 * reassigning the property.
 */
function sanitizeObjectInPlace(target: Record<string, any>): void {
  for (const key of Object.keys(target)) {
    target[key] = sanitizeObject(target[key]);
  }
}

/**
 * NestJS Middleware for input sanitization
 * 
 * Sanitizes request body, query parameters, and params
 */
@Injectable()
export class SanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        sanitizeObjectInPlace(req.query as Record<string, any>);
      }

      // Sanitize route parameters
      if (req.params && typeof req.params === 'object') {
        sanitizeObjectInPlace(req.params as Record<string, any>);
      }

      next();
    } catch (error) {
      // Log error but don't break the request
      console.error('Sanitization error:', error);
      next();
    }
  }
}

/**
 * Sanitize a single value (utility function for manual sanitization)
 */
export function sanitizeInput(input: any): any {
  return sanitizeObject(input);
}

/**
 * Express middleware function (can be used outside NestJS)
 */
export function sanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  const middleware = new SanitizationMiddleware();
  middleware.use(req, res, next);
}

/**
 * Configuration options for sanitization
 */
export interface SanitizationOptions {
  /**
   * Fields to skip sanitization (e.g., password fields that should be validated but not modified)
   */
  skipFields?: string[];

  /**
   * Fields that allow limited HTML (e.g., rich text editor content)
   * These fields will use a more lenient sanitization
   */
  allowHtmlFields?: string[];
}

/**
 * Advanced sanitization middleware with configuration
 */
@Injectable()
export class ConfigurableSanitizationMiddleware implements NestMiddleware {
  constructor(private options: SanitizationOptions = {}) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Sanitize request body with field-specific rules
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeWithOptions(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        sanitizeObjectInPlace(req.query as Record<string, any>);
      }

      // Sanitize route parameters
      if (req.params && typeof req.params === 'object') {
        sanitizeObjectInPlace(req.params as Record<string, any>);
      }

      next();
    } catch (error) {
      console.error('Sanitization error:', error);
      next();
    }
  }

  private sanitizeWithOptions(obj: any, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Check if this field should be skipped
      if (this.options.skipFields?.includes(path)) {
        return obj;
      }

      // Check if this field allows HTML
      if (this.options.allowHtmlFields?.includes(path)) {
        return this.sanitizeHtmlField(obj);
      }

      return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.sanitizeWithOptions(item, `${path}[${index}]`)
      );
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const fieldPath = path ? `${path}.${key}` : key;
          sanitized[key] = this.sanitizeWithOptions(obj[key], fieldPath);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize fields that allow HTML (more lenient)
   * Only removes the most dangerous patterns while allowing basic HTML
   */
  private sanitizeHtmlField(value: string): string {
    let sanitized = value;

    // Only remove script tags and event handlers
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/eval\(/gi, '');

    return sanitized;
  }
}

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Check if a string contains potentially dangerous content
   */
  containsDangerousContent(value: string): boolean {
    return DANGEROUS_PATTERNS.some((pattern) => pattern.test(value));
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml(value: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return value.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
  },

  /**
   * Validate email format (basic check)
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate URL format (basic check)
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};
