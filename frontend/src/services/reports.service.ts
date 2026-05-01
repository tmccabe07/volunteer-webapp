import api from '@/lib/axios';

/**
 * Reports API Service
 * 
 * Frontend service for interacting with reporting endpoints
 * Feature: 001-volunteer-management - User Story 9
 */

export interface ParticipationReportQuery {
  startDate?: string;
  endDate?: string;
  rankLevel?: string;
  format?: 'summary' | 'detailed';
}

export interface AdminTaskReportQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
  taskId?: string;
  format?: 'summary' | 'detailed';
}

export interface UpcomingEventsReportQuery {
  startDate?: string;
  endDate?: string;
  rankLevel?: string;
}

/**
 * Fetch participation report
 * @param query Query parameters for filtering the report
 * @returns Participation report data (summary or detailed)
 */
export async function getParticipationReport(query: ParticipationReportQuery) {
  const params = new URLSearchParams();

  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.rankLevel) params.append('rankLevel', query.rankLevel);
  if (query.format) params.append('format', query.format);

  const response = await api.get(`/reports/participation?${params.toString()}`);
  return response.data;
}

/**
 * Fetch administrative task completion report
 * @param query Query parameters for filtering the report
 * @returns Admin task report data (summary or detailed)
 */
export async function getAdminTaskReport(query: AdminTaskReportQuery) {
  const params = new URLSearchParams();

  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.status) params.append('status', query.status);
  if (query.taskId) params.append('taskId', query.taskId);
  if (query.format) params.append('format', query.format);

  const response = await api.get(`/reports/administrative-tasks?${params.toString()}`);
  return response.data;
}

/**
 * Fetch upcoming events report
 * @param query Query parameters for filtering the report
 * @returns Upcoming events report data with signups
 */
export async function getUpcomingEventsReport(query: UpcomingEventsReportQuery) {
  const params = new URLSearchParams();

  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.rankLevel) params.append('rankLevel', query.rankLevel);

  const response = await api.get(`/reports/upcoming-events?${params.toString()}`);
  return response.data;
}

/**
 * Export report data as CSV
 * @param reportType Type of report to export ('participation' or 'adminTask' or 'upcomingEvents')
 * @param data Report data to convert to CSV
 * @param filename Name for the downloaded file
 */
export function exportReportAsCSV(
  reportType: 'participation' | 'adminTask' | 'upcomingEvents',
  data: any,
  filename: string
) {
  let csvContent = '';

  if (reportType === 'participation') {
    if (data.volunteers) {
      // Detailed format
      csvContent = 'Volunteer Name,Email,Roles,Events Participated,Points Earned\n';
      data.volunteers.forEach((v: any) => {
        const roles = v.volunteer.roles.map((r: any) => r.name).join('; ');
        csvContent += `"${v.volunteer.name}","${v.volunteer.email}","${roles}",${v.eventsParticipated},${v.pointsEarned}\n`;
      });
    } else {
      // Summary format - top volunteers
      csvContent = 'Rank,Volunteer Name,Events Participated,Points Earned\n';
      data.topVolunteers.forEach((v: any, index: number) => {
        csvContent += `${index + 1},"${v.volunteer.name}",${v.eventsParticipated},${v.pointsEarned}\n`;
      });
    }
  } else if (reportType === 'adminTask') {
    if (data.tasks) {
      // Detailed format
      csvContent = 'Task Name,Due Date,Volunteer Name,Email,Roles,Completed At,Status\n';
      data.tasks.forEach((task: any) => {
        task.assignedVolunteers.forEach((assignment: any) => {
          const roles = assignment.volunteer.roles.map((r: any) => r.name).join('; ');
          const completedAt = assignment.completedAt
            ? new Date(assignment.completedAt).toLocaleDateString()
            : 'Not Completed';
          const status = assignment.isComplete ? 'Complete' : 'Pending';
          csvContent += `"${task.task.name}","${new Date(task.task.dueDate).toLocaleDateString()}","${assignment.volunteer.name}","${assignment.volunteer.email}","${roles}","${completedAt}","${status}"\n`;
        });
      });
    } else {
      // Summary format
      csvContent = 'Task Name,Due Date,Assigned,Completed,Completion Rate,Status\n';
      data.taskBreakdown.forEach((task: any) => {
        const status = task.isOverdue ? 'Overdue' : task.completionRate === 100 ? 'Complete' : 'In Progress';
        csvContent += `"${task.task.name}","${new Date(task.task.dueDate).toLocaleDateString()}",${task.assignedCount},${task.completedCount},${task.completionRate.toFixed(1)}%,"${status}"\n`;
      });
    }
  } else if (reportType === 'upcomingEvents') {
    // Upcoming events format - list events with signups
    csvContent = 'Event Title,Event Date,Rank Level,Activity Type,Capacity,Signups,Spots Remaining,Volunteer Name,Volunteer Email,Volunteer Roles\n';
    data.events.forEach((event: any) => {
      event.activitySlots.forEach((slot: any) => {
        const spotsRemaining = slot.spotsRemaining !== null ? slot.spotsRemaining : 'Unlimited';
        if (slot.signups.length === 0) {
          // Show event even if no signups
          csvContent += `"${event.title}","${new Date(event.eventDate).toLocaleDateString()}","${event.rankLevel}","${slot.activityType}",${slot.capacity || 'Unlimited'},0,${spotsRemaining},"","",""\n`;
        } else {
          slot.signups.forEach((signup: any) => {
            const roles = signup.volunteer.roles.map((r: any) => r.name).join('; ');
            csvContent += `"${event.title}","${new Date(event.eventDate).toLocaleDateString()}","${event.rankLevel}","${slot.activityType}",${slot.capacity || 'Unlimited'},${slot.signupsCount},${spotsRemaining},"${signup.volunteer.name}","${signup.volunteer.email}","${roles}"\n`;
          });
        }
      });
    });
  }

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
