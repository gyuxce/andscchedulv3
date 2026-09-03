import type { ClassType } from '../types';

/**
 * Composition rule shared by every path that creates or edits a class/session,
 * so the Semi-Private pod size is enforced consistently (Class Master form,
 * single session, recurring generator, and schedule edits).
 *
 * Returns a user-facing error string, or null when the composition is valid.
 */
export function classCompositionError(type: ClassType, studentIds: string[]): string | null {
  if (type === 'Semi-Private' && (studentIds.length < 2 || studentIds.length > 4)) {
    return 'Semi-Private sebaiknya 2–4 siswa';
  }
  return null;
}
