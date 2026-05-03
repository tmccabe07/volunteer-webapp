/**
 * Audit Logging Middleware
 * 
 * Logs all Tier 2+ actions to the AuditLog table for compliance and security tracking.
 * 
 * Usage in controllers:
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @RequireTier(AuthTier.LEADER)
 * @UseInterceptors(AuditInterceptor)
 * 
 * The interceptor automatically logs:
 * - User ID
 * - Action performed
 * - Entity type and ID
 * - Changes made (before/after values for updates)
 * - IP address
 * - User agent
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';
import { Request } from 'express';

// Actions that should be audited
export enum AuditAction {
  // Volunteer actions
  VOLUNTEER_CREATED = 'VOLUNTEER_CREATED',
  VOLUNTEER_UPDATED = 'VOLUNTEER_UPDATED',
  VOLUNTEER_DELETED = 'VOLUNTEER_DELETED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Role actions
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  
  // Event actions
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_DELETED = 'EVENT_DELETED',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  
  // Task actions
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  
  // Points actions
  POINTS_REVOKED = 'POINTS_REVOKED',
  POINTS_AWARDED = 'POINTS_AWARDED',
  
  // Configuration actions
  PACK_CONFIG_UPDATED = 'PACK_CONFIG_UPDATED',
  ACTIVITY_TYPE_CREATED = 'ACTIVITY_TYPE_CREATED',
  ACTIVITY_TYPE_UPDATED = 'ACTIVITY_TYPE_UPDATED',
  ACTIVITY_TYPE_DELETED = 'ACTIVITY_TYPE_DELETED',
  VOLUNTEER_ROLE_CREATED = 'VOLUNTEER_ROLE_CREATED',
  VOLUNTEER_ROLE_UPDATED = 'VOLUNTEER_ROLE_UPDATED',
  VOLUNTEER_ROLE_DELETED = 'VOLUNTEER_ROLE_DELETED',
}

// Entity types for audit logging
export enum AuditEntityType {
  VOLUNTEER = 'Volunteer',
  VOLUNTEER_ROLE = 'VolunteerRole',
  VOLUNTEER_TO_ROLE = 'VolunteerToRole',
  EVENT = 'Event',
  ADMIN_TASK = 'AdminTask',
  POINT_EVENT = 'PointEvent',
  PACK_CONFIG = 'PackConfig',
  ACTIVITY_TYPE = 'ActivityType',
}

/**
 * Helper function to create audit log entries
 * Can be called directly from services that need fine-grained control
 */
export async function createAuditLog(
  prismaClient: PrismaClient,
  data: {
    userId?: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  try {
    await prismaClient.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't break the application
    console.error('Audit log creation failed:', error);
  }
}

/**
 * NestJS Interceptor for automatic audit logging
 * 
 * Automatically logs actions based on HTTP method and route:
 * - POST: CREATE actions
 * - PUT/PATCH: UPDATE actions
 * - DELETE: DELETE actions
 * 
 * Can be customized per-route using metadata decorators
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;
    
    // Extract user from JWT payload (set by auth middleware)
    const user = (request as any).user;
    const userId = user?.userId;
    
    // Extract IP and user agent
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: async (data) => {
          // Determine action and entity based on route and method
          const auditInfo = this.determineAuditInfo(method, url, data);
          
          if (auditInfo) {
            await createAuditLog(prisma, {
              userId,
              action: auditInfo.action,
              entityType: auditInfo.entityType,
              entityId: auditInfo.entityId,
              changes: auditInfo.changes,
              ipAddress,
              userAgent,
            });
          }
        },
        error: (error) => {
          // Optionally log failed attempts
          console.error('Action failed, audit log skipped:', error.message);
        },
      }),
    );
  }

  /**
   * Determine audit information based on HTTP method and URL
   */
  private determineAuditInfo(
    method: string,
    url: string,
    responseData: any,
  ): {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    changes?: any;
  } | null {
    // Parse URL to extract entity type and ID
    const urlParts = url.split('/').filter(Boolean);
    
    // Events
    if (url.includes('/api/events')) {
      if (method === 'POST' && !url.includes('/complete') && !url.includes('/signup')) {
        return {
          action: AuditAction.EVENT_CREATED,
          entityType: AuditEntityType.EVENT,
          entityId: responseData?.id || 'unknown',
        };
      } else if (method === 'PUT') {
        const eventId = this.extractIdFromUrl(url, 'events');
        return {
          action: AuditAction.EVENT_UPDATED,
          entityType: AuditEntityType.EVENT,
          entityId: eventId,
        };
      } else if (method === 'DELETE') {
        const eventId = this.extractIdFromUrl(url, 'events');
        return {
          action: AuditAction.EVENT_DELETED,
          entityType: AuditEntityType.EVENT,
          entityId: eventId,
        };
      } else if (url.includes('/complete')) {
        const eventId = this.extractIdFromUrl(url, 'events');
        return {
          action: AuditAction.EVENT_COMPLETED,
          entityType: AuditEntityType.EVENT,
          entityId: eventId,
        };
      }
    }
    
    // Admin Tasks
    if (url.includes('/api/admin-tasks')) {
      if (method === 'POST') {
        return {
          action: AuditAction.TASK_CREATED,
          entityType: AuditEntityType.ADMIN_TASK,
          entityId: responseData?.id || 'unknown',
        };
      } else if (method === 'PUT') {
        const taskId = this.extractIdFromUrl(url, 'admin-tasks');
        return {
          action: AuditAction.TASK_UPDATED,
          entityType: AuditEntityType.ADMIN_TASK,
          entityId: taskId,
        };
      } else if (method === 'DELETE') {
        const taskId = this.extractIdFromUrl(url, 'admin-tasks');
        return {
          action: AuditAction.TASK_DELETED,
          entityType: AuditEntityType.ADMIN_TASK,
          entityId: taskId,
        };
      }
    }
    
    // Points
    if (url.includes('/api/points/revoke')) {
      return {
        action: AuditAction.POINTS_REVOKED,
        entityType: AuditEntityType.POINT_EVENT,
        entityId: responseData?.revocationEvent?.id || 'unknown',
      };
    }
    
    // Volunteers
    if (url.includes('/api/volunteers')) {
      if (url.includes('/roles') && method === 'POST') {
        return {
          action: AuditAction.ROLE_ASSIGNED,
          entityType: AuditEntityType.VOLUNTEER_TO_ROLE,
          entityId: responseData?.id || 'unknown',
        };
      } else if (url.includes('/roles') && method === 'DELETE') {
        const roleAssignmentId = this.extractIdFromUrl(url, 'roles');
        return {
          action: AuditAction.ROLE_REMOVED,
          entityType: AuditEntityType.VOLUNTEER_TO_ROLE,
          entityId: roleAssignmentId,
        };
      } else if (method === 'DELETE' && !url.includes('/roles')) {
        const volunteerId = this.extractIdFromUrl(url, 'volunteers');
        return {
          action: AuditAction.VOLUNTEER_DELETED,
          entityType: AuditEntityType.VOLUNTEER,
          entityId: volunteerId,
        };
      } else if (url.includes('/reset-password')) {
        const volunteerId = this.extractIdFromUrl(url, 'volunteers');
        return {
          action: AuditAction.PASSWORD_RESET,
          entityType: AuditEntityType.VOLUNTEER,
          entityId: volunteerId,
        };
      }
    }
    
    // Pack Configuration
    if (url.includes('/api/pack-config')) {
      if (method === 'PUT' && url === '/api/pack-config') {
        return {
          action: AuditAction.PACK_CONFIG_UPDATED,
          entityType: AuditEntityType.PACK_CONFIG,
          entityId: responseData?.id || 'pack-config',
        };
      }
      
      // Activity Types
      if (url.includes('/activity-types')) {
        if (method === 'POST') {
          return {
            action: AuditAction.ACTIVITY_TYPE_CREATED,
            entityType: AuditEntityType.ACTIVITY_TYPE,
            entityId: responseData?.id || 'unknown',
          };
        } else if (method === 'PUT') {
          const activityId = this.extractIdFromUrl(url, 'activity-types');
          return {
            action: AuditAction.ACTIVITY_TYPE_UPDATED,
            entityType: AuditEntityType.ACTIVITY_TYPE,
            entityId: activityId,
          };
        } else if (method === 'DELETE') {
          const activityId = this.extractIdFromUrl(url, 'activity-types');
          return {
            action: AuditAction.ACTIVITY_TYPE_DELETED,
            entityType: AuditEntityType.ACTIVITY_TYPE,
            entityId: activityId,
          };
        }
      }
      
      // Volunteer Roles
      if (url.includes('/volunteer-roles')) {
        if (method === 'POST') {
          return {
            action: AuditAction.VOLUNTEER_ROLE_CREATED,
            entityType: AuditEntityType.VOLUNTEER_ROLE,
            entityId: responseData?.id || 'unknown',
          };
        } else if (method === 'PUT') {
          const roleId = this.extractIdFromUrl(url, 'volunteer-roles');
          return {
            action: AuditAction.VOLUNTEER_ROLE_UPDATED,
            entityType: AuditEntityType.VOLUNTEER_ROLE,
            entityId: roleId,
          };
        } else if (method === 'DELETE') {
          const roleId = this.extractIdFromUrl(url, 'volunteer-roles');
          return {
            action: AuditAction.VOLUNTEER_ROLE_DELETED,
            entityType: AuditEntityType.VOLUNTEER_ROLE,
            entityId: roleId,
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract entity ID from URL path
   */
  private extractIdFromUrl(url: string, entityName: string): string {
    const parts = url.split('/');
    const entityIndex = parts.findIndex(p => p === entityName);
    if (entityIndex !== -1 && entityIndex + 1 < parts.length) {
      // Remove query parameters if present
      const id = parts[entityIndex + 1].split('?')[0];
      return id;
    }
    return 'unknown';
  }

  /**
   * Get client IP address from request
   * Handles proxies and load balancers
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
  }
}

/**
 * Custom decorator for manual audit logging
 * Use this when you need more control over what's logged
 * 
 * Example:
 * @Audit({ action: AuditAction.CUSTOM_ACTION, entityType: AuditEntityType.VOLUNTEER })
 */
export function Audit(metadata: {
  action: AuditAction;
  entityType: AuditEntityType;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Store metadata for use by the interceptor
    Reflect.defineMetadata('audit', metadata, target, propertyKey);
    return descriptor;
  };
}
