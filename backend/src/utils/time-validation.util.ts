/**
 * Time Validation Utility
 * 
 * Centralized validation for event time fields (eventTime, endTime, fullDay).
 * Ensures time format consistency and logical constraints.
 */

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Parse HH:mm time string to minutes since midnight
 * 
 * @param timeString - Time in HH:mm format (24-hour)
 * @returns Minutes since midnight (0-1439)
 * @throws Error if format is invalid
 * 
 * @example
 * parseTime('14:30') // returns 870 (14*60 + 30)
 * parseTime('00:00') // returns 0
 * parseTime('23:59') // returns 1439
 */
export function parseTime(timeString: string): number {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  const match = timeString.match(timeRegex);
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}. Expected HH:mm (24-hour format)`);
  }
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  return hours * 60 + minutes;
}

/**
 * Validate event time constraints
 * 
 * Rules:
 * 1. If fullDay=true, both eventTime and endTime must be null
 * 2. If endTime is provided, eventTime is required
 * 3. If both times provided, endTime should be after eventTime
 *    (Note: If endTime < eventTime, assumes midnight-spanning event - logs warning but allows)
 * 4. Time format must be HH:mm (24-hour)
 * 
 * @param eventTime - Start time (HH:mm format or null)
 * @param endTime - End time (HH:mm format or null)
 * @param fullDay - Whether event is full-day
 * @returns Validation result with error message if invalid
 * 
 * @example
 * // Valid cases
 * validateEventTimes('14:00', '16:00', false) // { valid: true }
 * validateEventTimes('14:00', null, false)    // { valid: true }
 * validateEventTimes(null, null, true)        // { valid: true }
 * 
 * // Invalid cases
 * validateEventTimes('14:00', '16:00', true)  // { valid: false, error: '...' }
 * validateEventTimes(null, '16:00', false)    // { valid: false, error: '...' }
 */
export function validateEventTimes(
  eventTime: string | null,
  endTime: string | null,
  fullDay: boolean
): ValidationResult {
  // Rule 1: Full-day events cannot have specific times
  if (fullDay) {
    if (eventTime !== null || endTime !== null) {
      return {
        valid: false,
        error: 'Full-day events cannot have specific start or end times. Both eventTime and endTime must be null when fullDay is true.'
      };
    }
    return { valid: true };
  }
  
  // Rule 2: End time requires start time
  if (endTime !== null && eventTime === null) {
    return {
      valid: false,
      error: 'End time requires a start time. eventTime must be provided when endTime is specified.'
    };
  }
  
  // Rule 3 & 4: Validate time format and logical ordering
  if (eventTime !== null && endTime !== null) {
    try {
      const startMinutes = parseTime(eventTime);
      const endMinutes = parseTime(endTime);
      
      // Check for midnight-spanning events (e.g., 23:00 to 01:00)
      if (endMinutes <= startMinutes) {
        // Log warning but allow (could be overnight event)
        console.warn(
          `Event spans midnight or has end time equal to start time: ${eventTime} to ${endTime}. ` +
          `This may indicate an overnight event. Verify this is intentional.`
        );
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid time format'
      };
    }
  }
  
  // Validate single time format if only eventTime provided
  if (eventTime !== null) {
    try {
      parseTime(eventTime);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid eventTime format'
      };
    }
  }
  
  return { valid: true };
}
