import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export interface DashboardUser {
  id: string;
  clerkId: string;
  username: string;
  email: string | null;
  role: UserRole;
}

export interface UserCounts {
  admins: number;
  teachers: number;
  students: number;
  parents: number;
}

export interface Demographics {
  maleStudents: number;
  femaleStudents: number;
  maleTeachers: number;
  femaleTeachers: number;
}

export interface AttendanceData {
  day: string;
  present: number;
  absent: number;
  percentage: number;
}

export interface FinanceData {
  month: string;
  income: number;
  expense: number;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  className?: string;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  description: string;
  date: Date;
}

export interface LessonItem {
  id: number;
  name: string;
  day: string;
  startTime: Date;
  endTime: Date;
  subject: string;
  class: string;
  teacherName?: string;
}

export interface ResultItem {
  id: number;
  score: number;
  examTitle?: string;
  assignmentTitle?: string;
  subject: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  surname: string;
  classId: number;
  className: string;
}

// Admin Dashboard Data
export async function getAdminDashboardData(): Promise<{
  counts: UserCounts;
  demographics: Demographics;
  attendance: AttendanceData[];
}> {
  const [
    admins,
    teachers,
    students,
    parents,
    maleStudents,
    femaleStudents,
    maleTeachers,
    femaleTeachers,
  ] = await Promise.all([
    prisma.admin.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.parent.count(),
    prisma.student.count({ where: { sex: "MALE" } }),
    prisma.student.count({ where: { sex: "FEMALE" } }),
    prisma.teacher.count({ where: { sex: "MALE" } }),
    prisma.teacher.count({ where: { sex: "FEMALE" } }),
  ]);

  // Get last 7 days attendance
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const attendanceRecords = await prisma.attendance.findMany({
    where: { date: { gte: sevenDaysAgo } },
    include: { student: { select: { id: true } } },
  });

  // Group by day
  const attendanceByDay = attendanceRecords.reduce((acc, record) => {
    const day = record.date.toISOString().split("T")[0];
    if (!acc[day]) acc[day] = { present: 0, absent: 0 };
    if (record.present) acc[day].present++;
    else acc[day].absent++;
    return acc;
  }, {} as Record<string, { present: number; absent: number }>);

  const attendance: AttendanceData[] = Object.entries(attendanceByDay)
    .map(([day, data]) => ({
      day,
      present: data.present,
      absent: data.absent,
      percentage: Math.round((data.present / (data.present + data.absent)) * 100) || 0,
    }))
    .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
    .slice(-7);

  return {
    counts: { admins, teachers, students, parents },
    demographics: {
      maleStudents,
      femaleStudents,
      maleTeachers,
      femaleTeachers,
    },
    attendance,
  };
}

export async function getRecentEvents(limit: number = 5): Promise<EventItem[]> {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { startTime: { gte: now } },
    orderBy: { startTime: "asc" },
    take: limit,
    include: { class: { select: { name: true } } },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime,
    endTime: e.endTime,
    className: e.class?.name,
  }));
}

export async function getAnnouncements(limit: number = 10): Promise<AnnouncementItem[]> {
  const announcements = await prisma.announcement.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    date: a.date,
  }));
}

// Teacher Dashboard Data
export async function getTeacherSchedule(teacherId: string): Promise<LessonItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: { teacherId },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return lessons.map((l) => ({
    id: l.id,
    name: l.name,
    day: l.day,
    startTime: l.startTime,
    endTime: l.endTime,
    subject: l.subject.name,
    class: l.class.name,
  }));
}

export async function getTeacherClasses(teacherId: string) {
  const classes = await prisma.class.findMany({
    where: { supervisorId: teacherId },
    include: {
      grade: { select: { level: true } },
      _count: { select: { students: true } },
    },
  });

  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade.level,
    studentCount: c._count.students,
  }));
}

// Student Dashboard Data
export async function getStudentSchedule(clerkId: string): Promise<LessonItem[]> {
  // First find the user by clerkId
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { studentId: true }
  });

  if (!user?.studentId) {
    console.error(`Student not found for clerkId: ${clerkId}`);
    return [];
  }

  // Then find the student with class information
  const student = await prisma.student.findUnique({
    where: { id: user.studentId },
    include: { 
      class: { 
        include: { 
          lessons: true 
        } 
      } 
    },
  });

  if (!student || !student.class) {
    console.error(`Student or class not found for clerkId: ${clerkId}`);
    return [];
  }

  const lessons = await prisma.lesson.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      teacher: { select: { name: true, surname: true } },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return lessons.map((l) => ({
    id: l.id,
    name: l.name,
    day: l.day,
    startTime: l.startTime,
    endTime: l.endTime,
    subject: l.subject.name,
    class: l.class.name,
    teacherName: l.teacher ? `${l.teacher.name} ${l.teacher.surname}` : undefined,
  }));
}

export async function getStudentResults(clerkId: string): Promise<ResultItem[]> {
  // First find the user by clerkId
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { studentId: true }
  });

  if (!user?.studentId) {
    console.error(`Student not found for clerkId: ${clerkId}`);
    return [];
  }

  // Then find the student by userId
  const student = await prisma.student.findUnique({
    where: { id: user.studentId },
    select: { id: true }
  });

  if (!student) {
    console.error(`Student record not found for clerkId: ${clerkId}`);
    return [];
  }

  // First get all results for the student with basic info
  const results = await prisma.result.findMany({
    where: { studentId: student.id },
    include: {
      exam: {
        include: {
          lesson: {
            include: {
              subject: {
                select: { name: true }
              }
            }
          }
        }
      },
      assignment: {
        include: {
          lesson: {
            include: {
              subject: {
                select: { name: true }
              }
            }
          }
        }
      }
    },
    orderBy: { id: "desc" },
    take: 10,
  });

  // Map the results to the expected format
  return results.map((r) => {
    const examTitle = r.exam ? r.exam.title : null;
    const assignmentTitle = r.assignment ? r.assignment.title : null;
    const subjectName = r.exam?.lesson?.subject?.name || 
                       r.assignment?.lesson?.subject?.name || 
                       "Unknown";

    return {
      id: r.id,
      score: r.score,
      examTitle,
      assignmentTitle,
      subject: subjectName,
    };
  });
}

export async function getStudentAttendanceStats(clerkId: string) {
  try {
    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { studentId: true }
    });

    if (!user?.studentId) {
      console.error(`Student not found for clerkId: ${clerkId}`);
      return {
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0,
        message: 'Student record not found'
      };
    }

    // Then find the student by userId
    const student = await prisma.student.findUnique({
      where: { id: user.studentId },
      select: { id: true }
    });

    if (!student) {
      console.error(`Student not found with clerkId: ${clerkId}`);
      return {
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0,
        message: 'Student record not found'
      };
    }

    const [total, present] = await Promise.all([
      prisma.attendance.count({ where: { studentId: student.id } }),
      prisma.attendance.count({ where: { studentId: student.id, present: true } })
    ]);

    return {
      total,
      present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    return {
      total: 0,
      present: 0,
      absent: 0,
      percentage: 0,
      error: 'Failed to load attendance data'
    };
  }
}

// Parent Dashboard Data
export async function getParentChildren(parentId: string): Promise<StudentInfo[]> {
  const students = await prisma.student.findMany({
    where: { parentId },
    include: { class: { select: { id: true, name: true } } },
  });

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    surname: s.surname,
    classId: s.classId,
    className: s.class.name,
  }));
}

export async function getChildResults(childId: string): Promise<ResultItem[]> {
  // Verify parent access is handled at higher level
  return getStudentResults(childId);
}

export async function getChildAttendanceStats(childId: string) {
  // Verify parent access is handled at higher level
  return getStudentAttendanceStats(childId);
}
