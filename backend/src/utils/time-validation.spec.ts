/**
 * Unit Tests: Time Validation Utility
 * 
 * Tests all validation rules and edge cases for event time handling
 */

import { parseTime, validateEventTimes } from './time-validation.util';

describe('parseTime', () => {
  describe('valid formats', () => {
    it('should parse midnight (00:00) as 0 minutes', () => {
      expect(parseTime('00:00')).toBe(0);
    });

    it('should parse noon (12:00) as 720 minutes', () => {
      expect(parseTime('12:00')).toBe(720);
    });

    it('should parse afternoon time (14:30) correctly', () => {
      expect(parseTime('14:30')).toBe(870); // 14*60 + 30
    });

    it('should parse end of day (23:59) as 1439 minutes', () => {
      expect(parseTime('23:59')).toBe(1439);
    });

    it('should parse early morning time (06:15) correctly', () => {
      expect(parseTime('06:15')).toBe(375); // 6*60 + 15
    });
  });

  describe('invalid formats', () => {
    it('should throw error for 12-hour format with AM/PM', () => {
      expect(() => parseTime('2:00 PM')).toThrow('Invalid time format');
    });

    it('should throw error for single-digit hours without leading zero', () => {
      expect(() => parseTime('9:00')).toThrow('Invalid time format');
    });

    it('should throw error for invalid hour (24)', () => {
      expect(() => parseTime('24:00')).toThrow('Invalid time format');
    });

    it('should throw error for invalid minutes (60)', () => {
      expect(() => parseTime('12:60')).toThrow('Invalid time format');
    });

    it('should throw error for missing colon separator', () => {
      expect(() => parseTime('1400')).toThrow('Invalid time format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseTime('')).toThrow('Invalid time format');
    });

    it('should throw error for invalid characters', () => {
      expect(() => parseTime('abc:def')).toThrow('Invalid time format');
    });
  });
});

describe('validateEventTimes', () => {
  describe('full-day events', () => {
    it('should be valid when fullDay=true and both times are null', () => {
      const result = validateEventTimes(null, null, true);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be invalid when fullDay=true with eventTime provided', () => {
      const result = validateEventTimes('14:00', null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Full-day events cannot have specific start or end times');
    });

    it('should be invalid when fullDay=true with endTime provided', () => {
      const result = validateEventTimes(null, '16:00', true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Full-day events cannot have specific start or end times');
    });

    it('should be invalid when fullDay=true with both times provided', () => {
      const result = validateEventTimes('14:00', '16:00', true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Full-day events cannot have specific start or end times');
    });
  });

  describe('timed events - valid cases', () => {
    it('should be valid with only eventTime (no end time)', () => {
      const result = validateEventTimes('14:00', null, false);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid with both times when end > start', () => {
      const result = validateEventTimes('14:00', '16:00', false);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid with no times (both null)', () => {
      const result = validateEventTimes(null, null, false);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid with early morning start time', () => {
      const result = validateEventTimes('06:00', '08:00', false);
      expect(result.valid).toBe(true);
    });

    it('should be valid with evening time range', () => {
      const result = validateEventTimes('18:00', '20:30', false);
      expect(result.valid).toBe(true);
    });
  });

  describe('timed events - invalid cases', () => {
    it('should be invalid when endTime provided without eventTime', () => {
      const result = validateEventTimes(null, '16:00', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End time requires a start time');
    });

    it('should be invalid with malformed eventTime', () => {
      const result = validateEventTimes('2:00 PM', null, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });

    it('should be invalid with malformed endTime', () => {
      const result = validateEventTimes('14:00', '4:00 PM', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });

    it('should be invalid when eventTime has invalid hour', () => {
      const result = validateEventTimes('25:00', '16:00', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });

    it('should be invalid when endTime has invalid minutes', () => {
      const result = validateEventTimes('14:00', '16:61', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });
  });

  describe('midnight-spanning events (edge cases)', () => {
    it('should allow but warn for events spanning midnight (23:00 to 01:00)', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = validateEventTimes('23:00', '01:00', false);
      expect(result.valid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event spans midnight')
      );
      
      consoleSpy.mockRestore();
    });

    it('should allow but warn when end time equals start time', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = validateEventTimes('14:00', '14:00', false);
      expect(result.valid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('end time equal to start time')
      );
      
      consoleSpy.mockRestore();
    });

    it('should allow but warn for late-night to early-morning event', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = validateEventTimes('22:30', '02:15', false);
      expect(result.valid).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('backward compatibility', () => {
    it('should support existing events with only eventTime and no fullDay flag', () => {
      // Existing events: eventTime = string, endTime = null, fullDay = false (default)
      const result = validateEventTimes('14:00', null, false);
      expect(result.valid).toBe(true);
    });

    it('should support existing events with no times', () => {
      // Some existing events may have no times specified
      const result = validateEventTimes(null, null, false);
      expect(result.valid).toBe(true);
    });
  });
});
