/**
 * Validation Utilities
 * Functions for validating data
 */

import { VALIDATION } from '../constants/app';

/**
 * Validate weight value
 * @param weight - Weight to validate
 * @returns True if valid
 */
export function isValidWeight(weight: number): boolean {
  return weight >= VALIDATION.MIN_WEIGHT && weight <= VALIDATION.MAX_WEIGHT;
}

/**
 * Validate plate number format
 * @param plate - Plate number to validate
 * @returns True if valid
 */
export function isValidPlateNumber(plate: string): boolean {
  return VALIDATION.PLATE_NUMBER_PATTERN.test(plate.trim());
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export function isValidPhoneNumber(phone: string): boolean {
  return VALIDATION.PHONE_PATTERN.test(phone.trim());
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

/**
 * Validate required field (not empty)
 * @param value - Value to validate
 * @returns True if not empty
 */
export function isRequired(value: string | number | null | undefined): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Validate minimum length
 * @param value - Value to validate
 * @param minLength - Minimum length
 * @returns True if valid
 */
export function isMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Validate maximum length
 * @param value - Value to validate
 * @param maxLength - Maximum length
 * @returns True if valid
 */
export function isMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength;
}

/**
 * Validate date is not in the future
 * @param date - Date to validate
 * @returns True if date is not in the future
 */
export function isNotFutureDate(date: Date): boolean {
  return date <= new Date();
}

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns True if startDate is before endDate
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON string
 * @param jsonString - JSON string to validate
 * @returns True if valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate object has required fields
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @returns True if all required fields exist and are not empty
 */
export function hasRequiredFields(obj: any, requiredFields: string[]): boolean {
  return requiredFields.every((field) => {
    const value = obj[field];
    return isRequired(value);
  });
}

