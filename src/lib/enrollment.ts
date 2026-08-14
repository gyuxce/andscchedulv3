import type { ClassMaster, Enrollment, EnrollmentStatus } from '../types';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function findActiveEnrollment(
  enrollments: Enrollment[],
  studentId: string,
  level?: string
) {
  return enrollments.find(
    (item) =>
      item.studentId === studentId &&
      item.status === 'active' &&
      (level == null || item.level === level)
  );
}

/** Close active enrollment for a level; optionally open next. Never overwrites history. */
export function progressEnrollmentJourney(input: {
  enrollments: Enrollment[];
  studentId: string;
  completedLevel: string;
  nextLevel: string | null;
  createId: () => string;
  actorName?: string;
  classType?: Enrollment['classType'];
  senseiId?: string | null;
  classId?: string | null;
  notes?: string;
}): { enrollments: Enrollment[]; changed: Enrollment[] } {
  const now = new Date().toISOString();
  const endDate = todayIsoDate();
  const changed: Enrollment[] = [];
  let next = input.enrollments.map((item) => {
    if (
      item.studentId === input.studentId &&
      item.level === input.completedLevel &&
      item.status === 'active'
    ) {
      const closed: Enrollment = {
        ...item,
        status: 'completed' as EnrollmentStatus,
        endDate,
        notes: input.notes ? [item.notes, input.notes].filter(Boolean).join(' · ') : item.notes,
        updatedAt: now,
        updatedBy: input.actorName
      };
      changed.push(closed);
      return closed;
    }
    return item;
  });

  if (input.nextLevel) {
    const existingActiveNext = findActiveEnrollment(next, input.studentId, input.nextLevel);
    if (!existingActiveNext) {
      const opened: Enrollment = {
        id: input.createId(),
        studentId: input.studentId,
        level: input.nextLevel,
        classType: input.classType ?? null,
        classId: input.classId ?? null,
        senseiId: input.senseiId ?? null,
        status: 'active',
        startDate: endDate,
        endDate: null,
        notes: input.notes,
        updatedAt: now,
        updatedBy: input.actorName
      };
      changed.push(opened);
      next = [opened, ...next];
    }
  }

  return { enrollments: next, changed };
}

/** Ensure each class student has an active enrollment for the class level (additive). */
export function ensureClassEnrollments(input: {
  enrollments: Enrollment[];
  teachingClass: ClassMaster;
  createId: () => string;
  actorName?: string;
}): { enrollments: Enrollment[]; changed: Enrollment[] } {
  const now = new Date().toISOString();
  const startDate = input.teachingClass.startDate || todayIsoDate();
  const changed: Enrollment[] = [];
  let next = [...input.enrollments];

  for (const studentId of input.teachingClass.studentIds) {
    const activeSameLevel = findActiveEnrollment(next, studentId, input.teachingClass.level);
    if (activeSameLevel) {
      if (
        activeSameLevel.classId !== input.teachingClass.id ||
        activeSameLevel.senseiId !== input.teachingClass.senseiId
      ) {
        const linked: Enrollment = {
          ...activeSameLevel,
          classId: input.teachingClass.id,
          senseiId: input.teachingClass.senseiId,
          classType: input.teachingClass.type,
          updatedAt: now,
          updatedBy: input.actorName
        };
        changed.push(linked);
        next = next.map((item) => (item.id === linked.id ? linked : item));
      }
      continue;
    }

    const opened: Enrollment = {
      id: input.createId(),
      studentId,
      level: input.teachingClass.level,
      classType: input.teachingClass.type,
      classId: input.teachingClass.id,
      senseiId: input.teachingClass.senseiId,
      status: 'active',
      startDate,
      endDate: null,
      updatedAt: now,
      updatedBy: input.actorName
    };
    changed.push(opened);
    next = [opened, ...next];
  }

  return { enrollments: next, changed };
}
