/**
 * Time Formatting Utility
 * 
 * Display formatting for event times in the frontend.
 * Handles conversion from 24-hour to 12-hour format, duration calculations,
 * and unified event time display logic.
 */

/**
 * Event interface (subset for time formatting)
 */
export interface EventTimeData {
  eventTime?: string | null;
  endTime?: string | null;
  fullDay?: boolean;
}

/**
 * Convert 24-hour time (HH:mm) to 12-hour format (h:mm AM/PM)
 * 
 * @param time24 - Time in HH:mm format (24-hour)
 * @returns Time in 12-hour format with AM/PM
 * 
 * @example
 * format12hr('00:00') // '12:00 AM'
 * format12hr('12:00') // '12:00 PM'
 * format12hr('14:30') // '2:30 PM'
 * format12hr('23:59') // '11:59 PM'
 */
export function format12hr(time24: string): string {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  const match = time24.match(timeRegex);
  
  if (!match) {
    // Return original if format is invalid (graceful fallback)
    return time24;
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  if (hours === 0) {
    hours = 12; // Midnight
  } else if (hours > 12) {
    hours -= 12; // Afternoon/evening
  }
  
  return `${hours}:${minutes} ${period}`;
}

/**
 * Calculate duration between two times
 * 
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @returns Human-readable duration (e.g., "2 hours", "1 hour 30 minutes")
 * 
 * @example
 * calculateDuration('14:00', '16:00') // '2 hours'
 * calculateDuration('14:00', '15:30') // '1 hour 30 minutes'
 * calculateDuration('09:00', '09:45') // '45 minutes'
 * calculateDuration('23:00', '01:00') // '2 hours' (handles midnight spanning)
 */
export function calculateDuration(startTime: string, endTime: string): string {
  const parseMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  let startMinutes = parseMinutes(startTime);
  let endMinutes = parseMinutes(endTime);
  
  // Handle midnight-spanning events (e.g., 23:00 to 01:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours to end time
  }
  
  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Format event time for display based on available time data
 * 
 * Display logic:
 * - Full-day event: "All Day"
 * - Both start and end time: "2:00 PM - 4:30 PM"
 * - Start time only: "2:00 PM"
 * - No times: "" (empty string)
 * 
 * @param event - Event data with time fields
 * @returns Formatted time string for display
 * 
 * @example
 * formatEventTime({ fullDay: true }) 
 * // 'All Day'
 * 
 * formatEventTime({ eventTime: '14:00', endTime: '16:30', fullDay: false })
 * // '2:00 PM - 4:30 PM'
 * 
 * formatEventTime({ eventTime: '14:00', endTime: null, fullDay: false })
 * // '2:00 PM'
 * 
 * formatEventTime({ eventTime: null, endTime: null, fullDay: false })
 * // ''
 */
export function formatEventTime(event: EventTimeData): string {
  // Full-day events
  if (event.fullDay) {
    return 'All Day';
  }
  
  // No times specified
  if (!event.eventTime) {
    return '';
  }
  
  // Start time only
  if (!event.endTime) {
    return format12hr(event.eventTime);
  }
  
  // Both start and end times
  return `${format12hr(event.eventTime)} - ${format12hr(event.endTime)}`;
}
