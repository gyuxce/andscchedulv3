import type { AppRole, Permissions } from '../types';

export function getPermissions(role: AppRole): Permissions {
  if (role === 'Super Admin') {
    return {
      role,
      canViewAllSchedules: true,
      canEditOfficialSchedule: true,
      canAssignSensei: true,
      canMarkOwnAvailability: true,
      canOverrideAvailability: true,
      canClockOwn: false,
      canOverrideClock: true,
      canInputAttendance: false,
      canOverrideAcademic: true,
      canReviewQa: true,
      canEditQa: true,
      canViewOwnQa: false,
      canManageUsers: true,
      canViewAudit: true,
      canViewAllSensei: true
    };
  }

  if (role === 'Kyouiku') {
    return {
      role,
      canViewAllSchedules: true,
      canEditOfficialSchedule: false,
      canAssignSensei: false,
      canMarkOwnAvailability: false,
      canOverrideAvailability: false,
      canClockOwn: false,
      canOverrideClock: false,
      canInputAttendance: false,
      canOverrideAcademic: true,
      canReviewQa: true,
      canEditQa: true,
      canViewOwnQa: false,
      canManageUsers: false,
      canViewAudit: true,
      canViewAllSensei: true
    };
  }

  return {
    role,
    canViewAllSchedules: false,
    canEditOfficialSchedule: false,
    canAssignSensei: false,
    canMarkOwnAvailability: true,
    canOverrideAvailability: false,
    canClockOwn: true,
    canOverrideClock: false,
    canInputAttendance: true,
    canOverrideAcademic: false,
    canReviewQa: false,
    canEditQa: false,
    canViewOwnQa: true,
    canManageUsers: false,
    canViewAudit: false,
    canViewAllSensei: false
  };
}
