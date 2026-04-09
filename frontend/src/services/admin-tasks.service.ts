/**
 * Admin Tasks API Service
 * 
 * Client-side service for administrative task management operations
 */

import axios from '@/lib/axios';

export interface CompletionStep {
  step: string;
  url?: string;
}

export interface CreateAdminTaskData {
  name: string;
  description?: string;
  dueDate: string;
  completionSteps?: CompletionStep[];
  isPackWide?: boolean;
  assignedRoleIds?: string[];
  isRecurring?: boolean;
}

export interface UpdateAdminTaskData {
  name?: string;
  description?: string;
  dueDate?: string;
  completionSteps?: CompletionStep[];
  isPackWide?: boolean;
  assignedRoleIds?: string[];
  isRecurring?: boolean;
}

export interface ListAdminTasksParams {
  page?: number;
  limit?: number;
  assignedToMe?: boolean;
  status?: 'complete' | 'incomplete' | 'overdue';
  taskId?: string;
}

const adminTasksService = {
  /**
   * List administrative tasks with filters
   */
  async listTasks(params: ListAdminTasksParams = {}) {
    const response = await axios.get('/admin-tasks', { params });
    return response.data;
  },

  /**
   * Get single task by ID
   */
  async getTask(taskId: string) {
    const response = await axios.get(`/admin-tasks/${taskId}`);
    return response.data;
  },

  /**
   * Create a new administrative task (Tier 2+ only)
   */
  async createTask(data: CreateAdminTaskData) {
    const response = await axios.post('/admin-tasks', data);
    return response.data;
  },

  /**
   * Update an existing administrative task (Tier 2+ only)
   */
  async updateTask(taskId: string, data: UpdateAdminTaskData) {
    const response = await axios.put(`/admin-tasks/${taskId}`, data);
    return response.data;
  },

  /**
   * Mark task as complete for current user
   */
  async completeTask(taskId: string) {
    const response = await axios.post(`/admin-tasks/${taskId}/complete`);
    return response.data;
  },

  /**
   * Undo task completion for current user
   */
  async uncompleteTask(taskId: string) {
    await axios.delete(`/admin-tasks/${taskId}/complete`);
  },

  /**
   * Delete a task (soft delete, Tier 2+ only)
   */
  async deleteTask(taskId: string) {
    await axios.delete(`/admin-tasks/${taskId}`);
  },

  /**
   * Get task completions (Tier 2+ only)
   */
  async getTaskCompletions(taskId: string) {
    const response = await axios.get(`/admin-tasks/${taskId}/completions`);
    return response.data;
  },

  /**
   * Get available volunteer roles (for task assignment)
   */
  async getVolunteerRoles() {
    const response = await axios.get('/volunteers/roles/available');
    return response.data;
  },
};

export default adminTasksService;
