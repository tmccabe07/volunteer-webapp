/**
 * Unit Tests: Time Formatting Utility
 * 
 * Tests all formatting functions for event time display
 */

import { describe, it, expect } from 'vitest';
import { format12hr, calculateDuration, formatEventTime } from './time-format.util';

describe('format12hr', () => {
  describe('morning times', () => {
    it('should format midnight (00:00) as 12:00 AM', () => {
      expect(format12hr('00:00')).toBe('12:00 AM');
    });

    it('should format early morning (06:30) as 6:30 AM', () => {
      expect(format12hr('06:30')).toBe('6:30 AM');
    });

    it('should format late morning (11:45) as 11:45 AM', () => {
      expect(format12hr('11:45')).toBe('11:45 AM');
    });
  });

  describe('afternoon/evening times', () => {
    it('should format noon (12:00) as 12:00 PM', () => {
      expect(format12hr('12:00')).toBe('12:00 PM');
    });

    it('should format afternoon (14:30) as 2:30 PM', () => {
      expect(format12hr('14:30')).toBe('2:30 PM');
    });

    it('should format evening (18:15) as 6:15 PM', () => {
      expect(format12hr('18:15')).toBe('6:15 PM');
    });

    it('should format late night (23:59) as 11:59 PM', () => {
      expect(format12hr('23:59')).toBe('11:59 PM');
    });
  });

  describe('edge cases', () => {
    it('should handle 1:00 AM correctly', () => {
      expect(format12hr('01:00')).toBe('1:00 AM');
    });

    it('should handle 1:00 PM correctly', () => {
      expect(format12hr('13:00')).toBe('1:00 PM');
    });

    it('should return original string for invalid format (graceful fallback)', () => {
      expect(format12hr('invalid')).toBe('invalid');
    });
  });
});

describe('calculateDuration', () => {
  describe('hour-only durations', () => {
    it('should calculate 1 hour duration', () => {
      expect(calculateDuration('14:00', '15:00')).toBe('1 hour');
    });

    it('should calculate 2 hours duration', () => {
      expect(calculateDuration('14:00', '16:00')).toBe('2 hours');
    });

    it('should calculate 5 hours duration', () => {
      expect(calculateDuration('09:00', '14:00')).toBe('5 hours');
    });
  });

  describe('minute-only durations', () => {
    it('should calculate 30 minutes duration', () => {
      expect(calculateDuration('14:00', '14:30')).toBe('30 minutes');
    });

    it('should calculate 45 minutes duration', () => {
      expect(calculateDuration('09:00', '09:45')).toBe('45 minutes');
    });

    it('should calculate 1 minute duration (singular)', () => {
      expect(calculateDuration('14:00', '14:01')).toBe('1 minute');
    });
  });

  describe('combined durations', () => {
    it('should calculate 1 hour 30 minutes', () => {
      expect(calculateDuration('14:00', '15:30')).toBe('1 hour 30 minutes');
    });

    it('should calculate 2 hours 15 minutes', () => {
      expect(calculateDuration('14:00', '16:15')).toBe('2 hours 15 minutes');
    });

    it('should calculate 3 hours 45 minutes', () => {
      expect(calculateDuration('09:00', '12:45')).toBe('3 hours 45 minutes');
    });
  });

  describe('midnight-spanning events', () => {
    it('should handle event from 23:00 to 01:00 (2 hours)', () => {
      expect(calculateDuration('23:00', '01:00')).toBe('2 hours');
    });

    it('should handle event from 22:30 to 02:15 (3 hours 45 minutes)', () => {
      expect(calculateDuration('22:30', '02:15')).toBe('3 hours 45 minutes');
    });

    it('should handle event from 23:45 to 00:15 (30 minutes)', () => {
      expect(calculateDuration('23:45', '00:15')).toBe('30 minutes');
    });
  });
});

describe('formatEventTime', () => {
  describe('full-day events', () => {
    it('should display "All Day" for full-day events', () => {
      expect(formatEventTime({ fullDay: true })).toBe('All Day');
    });

    it('should display "All Day" even if times are present (edge case)', () => {
      // Should not happen with proper validation, but test graceful handling
      expect(formatEventTime({ 
        fullDay: true, 
        eventTime: '14:00', 
        endTime: '16:00' 
      })).toBe('All Day');
    });
  });

  describe('timed events - both start and end', () => {
    it('should display time range for morning event', () => {
      expect(formatEventTime({
        eventTime: '09:00',
        endTime: '11:30',
        fullDay: false
      })).toBe('9:00 AM - 11:30 AM');
    });

    it('should display time range for afternoon event', () => {
      expect(formatEventTime({
        eventTime: '14:00',
        endTime: '16:30',
        fullDay: false
      })).toBe('2:00 PM - 4:30 PM');
    });

    it('should display time range crossing noon', () => {
      expect(formatEventTime({
        eventTime: '11:00',
        endTime: '13:00',
        fullDay: false
      })).toBe('11:00 AM - 1:00 PM');
    });

    it('should display time range for evening event', () => {
      expect(formatEventTime({
        eventTime: '18:00',
        endTime: '20:00',
        fullDay: false
      })).toBe('6:00 PM - 8:00 PM');
    });
  });

  describe('timed events - start time only', () => {
    it('should display only start time when no end time', () => {
      expect(formatEventTime({
        eventTime: '14:00',
        endTime: null,
        fullDay: false
      })).toBe('2:00 PM');
    });

    it('should display morning start time', () => {
      expect(formatEventTime({
        eventTime: '09:00',
        fullDay: false
      })).toBe('9:00 AM');
    });

    it('should display evening start time', () => {
      expect(formatEventTime({
        eventTime: '18:30',
        fullDay: false
      })).toBe('6:30 PM');
    });
  });

  describe('no times specified', () => {
    it('should return empty string when no eventTime', () => {
      expect(formatEventTime({
        eventTime: null,
        endTime: null,
        fullDay: false
      })).toBe('');
    });

    it('should return empty string when eventTime is undefined', () => {
      expect(formatEventTime({
        fullDay: false
      })).toBe('');
    });
  });

  describe('backward compatibility', () => {
    it('should handle existing events with only eventTime', () => {
      // Existing events before this feature
      expect(formatEventTime({
        eventTime: '14:00',
        endTime: null
      })).toBe('2:00 PM');
    });

    it('should handle events with no times at all', () => {
      // Some existing events may not have times
      expect(formatEventTime({
        eventTime: null
      })).toBe('');
    });
  });
});
