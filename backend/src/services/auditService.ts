import { prisma } from '../lib/db';

export type AuditAction = 
  | 'CATEGORY_ROLE_CHANGE'
  | 'AUTH_ROLE_CHANGE'
  | 'VIDEO_APPROVED'
  | 'VIDEO_REJECTED'
  | 'VIDEO_DELETED'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'TOKEN_INVALIDATED'
  | 'OTHER';

export interface AuditLogData {
  actorId: string;
  targetUserId?: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Audit logging service for tracking important system events
 */
export class AuditService {
  /**
   * Log an audit event
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: data.actorId,
          targetUserId: data.targetUserId,
          action: data.action,
          oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
          newValue: data.newValue ? JSON.stringify(data.newValue) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break the main flow
      // But log the error for monitoring
      console.error('[AuditService] Failed to log audit event:', error);
    }
  }

  /**
   * Log category role change
   */
  static async logCategoryRoleChange(
    actorId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.log({
      actorId,
      targetUserId,
      action: 'CATEGORY_ROLE_CHANGE',
      oldValue: { categoryRole: oldRole },
      newValue: { categoryRole: newRole },
    });
  }

  /**
   * Log auth role change
   */
  static async logAuthRoleChange(
    actorId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.log({
      actorId,
      targetUserId,
      action: 'AUTH_ROLE_CHANGE',
      oldValue: { role: oldRole },
      newValue: { role: newRole },
    });
  }

  /**
   * Log video approval
   */
  static async logVideoApproval(
    actorId: string,
    videoId: string,
    notes?: string
  ): Promise<void> {
    await this.log({
      actorId,
      action: 'VIDEO_APPROVED',
      newValue: { videoId },
      metadata: notes ? { notes } : undefined,
    });
  }

  /**
   * Log video rejection
   */
  static async logVideoRejection(
    actorId: string,
    videoId: string,
    reason: string,
    notes?: string
  ): Promise<void> {
    await this.log({
      actorId,
      action: 'VIDEO_REJECTED',
      newValue: { videoId },
      metadata: { reason, ...(notes ? { notes } : {}) },
    });
  }

  /**
   * Log token invalidation (for forced logout)
   */
  static async logTokenInvalidation(
    actorId: string,
    reason: string
  ): Promise<void> {
    await this.log({
      actorId,
      action: 'TOKEN_INVALIDATED',
      metadata: { reason },
    });
  }

  /**
   * Get audit logs for a specific user
   */
  static async getLogsByTargetUser(
    targetUserId: string,
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      where: { targetUserId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific actor
   */
  static async getLogsByActor(
    actorId: string,
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type
   */
  static async getLogsByAction(
    action: AuditAction,
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      where: { action },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Log user creation by admin
   */
  static async logUserCreation(
    actorId: string,
    targetUserId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      actorId,
      targetUserId,
      action: 'USER_CREATED',
      newValue: { userId: targetUserId },
      metadata,
    });
  }

  /**
   * Log password reset request
   */
  static async logPasswordResetRequest(
    targetUserId: string,
    actorId?: string | null
  ): Promise<void> {
    await this.log({
      actorId: actorId || 'system', // Use 'system' if self-requested
      targetUserId,
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { selfRequested: !actorId },
    });
  }

  /**
   * Log password reset completion
   */
  static async logPasswordResetCompleted(
    targetUserId: string,
    actorId?: string | null
  ): Promise<void> {
    await this.log({
      actorId: actorId || 'system',
      targetUserId,
      action: 'PASSWORD_RESET_COMPLETED',
      metadata: { selfRequested: !actorId },
    });
  }
}

