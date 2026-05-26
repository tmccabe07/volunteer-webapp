import axios from '@/lib/axios';

/**
 * Attendance types
 */
export interface RecordAttendanceItem {
  childScoutId: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  notes?: string;
  coveredRequirementIds?: string[];
}

export interface RecordAttendanceData {
  attendance: RecordAttendanceItem[];
}

export interface CoveredRequirement {
  id: string;
  adventureName: string;
  requirementText: string;
}

export interface ChildAttendanceDetail {
  child: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  notes?: string;
  coveredRequirements: CoveredRequirement[];
  recordedAt?: string;
  recordedBy?: string;
}

export interface GetAttendanceResponse {
  event: {
    id: string;
    title: string;
    eventDate: string;
  };
  attendance: ChildAttendanceDetail[];
}

/**
 * Attendance API Service
 */
export class AttendanceService {
  /**
   * Record attendance for multiple children at an event
   */
  async recordAttendance(eventId: string, data: RecordAttendanceData): Promise<any> {
    const response = await axios.patch(`/events/${eventId}/child-attendance`, data);
    return response.data;
  }

  /**
   * Get attendance records for an event
   */
  async getEventAttendance(
    eventId: string,
    statusFilter?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'
  ): Promise<GetAttendanceResponse> {
    const params = statusFilter ? { status: statusFilter } : {};
    const response = await axios.get<GetAttendanceResponse>(
      `/events/${eventId}/child-attendance`,
      { params }
    );
    return response.data;
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService();
