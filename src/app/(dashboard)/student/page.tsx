import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getUserWithRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentSchedule, getStudentResults, getStudentAttendanceStats } from "@/lib/dashboard-data";
import { DashboardLoader, DashboardError, EmptyState } from "@/components/dashboard/DashboardStates";
import { Calendar, CheckCircle, FileText, TrendingUp, BookOpen } from "lucide-react";
import prisma from "@/lib/prisma";

// Schedule Component
async function StudentSchedule({ studentId }: { studentId: string }) {
  try {
    const lessons = await getStudentSchedule(studentId);

    if (lessons.length === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">My Schedule</h3>
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="No schedule available"
            message="Your class schedule will appear here once assigned to a class"
          />
        </div>
      );
    }

    const lessonsByDay = lessons.reduce((acc, lesson) => {
      if (!acc[lesson.day]) acc[lesson.day] = [];
      acc[lesson.day].push(lesson);
      return acc;
    }, {} as Record<string, typeof lessons>);

    const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">My Schedule</h3>
          <span className="text-sm text-gray-500">{lessons.length} lessons/week</span>
        </div>
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {days.map((day) => {
            const dayLessons = lessonsByDay[day] || [];
            if (dayLessons.length === 0) return null;

            return (
              <div key={day} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">{day}</h4>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <div key={lesson.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{lesson.subject}</p>
                          <p className="text-sm text-gray-600">{lesson.class}</p>
                          {lesson.teacherName && (
                            <p className="text-xs text-gray-500 mt-1">👤 {lesson.teacherName}</p>
                          )}
                        </div>
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                          {new Date(lesson.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load schedule" />;
  }
}

// Attendance Card
async function AttendanceCard({ studentId }: { studentId: string }) {
  try {
    const stats = await getStudentAttendanceStats(studentId);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Attendance</h3>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
              <circle cx="64" cy="64" r="56" stroke="#22c55e" strokeWidth="12" fill="none" 
                strokeDasharray={`${stats.percentage * 3.52} 352`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{stats.percentage}%</span>
              <span className="text-xs text-gray-500">Present</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-semibold text-green-700">{stats.present}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-lg font-semibold text-red-700">{stats.absent}</p>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-semibold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load attendance" />;
  }
}

// Recent Results Component
async function RecentResults({ studentId }: { studentId: string }) {
  try {
    const results = await getStudentResults(studentId);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recent Results</h3>
        </div>
        
        {results.length === 0 ? (
          <EmptyState title="No results yet" message="Your exam and assignment results will appear here" />
        ) : (
          <div className="space-y-3">
            {results.slice(0, 5).map((result) => (
              <div key={result.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{result.subject}</p>
                    <p className="text-sm text-gray-500">{result.examTitle || result.assignmentTitle}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    result.score >= 80 ? "bg-green-100 text-green-700" :
                    result.score >= 60 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {result.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load results" />;
  }
}

// Upcoming Exams & Assignments
async function UpcomingWork({ studentId }: { studentId: string }) {
  try {
    const now = new Date();
    
    const [exams, assignments] = await Promise.all([
      prisma.exam.findMany({
        where: { lesson: { class: { students: { some: { id: studentId } } } }, startTime: { gte: now } },
        include: { lesson: { include: { subject: true } } },
        orderBy: { startTime: "asc" },
        take: 3,
      }),
      prisma.assignment.findMany({
        where: { lesson: { class: { students: { some: { id: studentId } } } }, dueDate: { gte: now } },
        include: { lesson: { include: { subject: true } } },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
    ]);

    const hasWork = exams.length > 0 || assignments.length > 0;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">Upcoming</h3>
        </div>
        
        {!hasWork ? (
          <EmptyState title="No upcoming work" message="You're all caught up!" />
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={`exam-${exam.id}`} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">📝 {exam.title}</p>
                    <p className="text-sm text-gray-600">{exam.lesson.subject.name}</p>
                  </div>
                  <span className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded-full">
                    {new Date(exam.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
            {assignments.map((assignment) => (
              <div key={`assignment-${assignment.id}`} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">📚 {assignment.title}</p>
                    <p className="text-sm text-gray-600">{assignment.lesson.subject.name}</p>
                  </div>
                  <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                    Due {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load upcoming work" />;
  }
}

// Class Info Card
async function ClassInfo({ studentId }: { studentId: string }) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { grade: true } } },
    });

    if (!student) return null;

    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-md text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-blue-100 text-sm">Current Class</p>
            <p className="text-2xl font-bold">{student.class.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-100 text-xs">Grade Level</p>
            <p className="text-lg font-semibold">Grade {student.class.grade.level}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-100 text-xs">Class ID</p>
            <p className="text-lg font-semibold">#{student.class.id}</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return null;
  }
}

// Main Student Page Component
const StudentPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getUserWithRole(userId);

  if (!user || user.role !== "student") {
    redirect(`/${user?.role || "sign-in"}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Student Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user.username}</p>
      </div>

      {/* Top Row - Class Info & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<DashboardLoader message="Loading class info..." />}>
            <ClassInfo studentId={userId} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<DashboardLoader message="Loading attendance..." />}>
            <AttendanceCard studentId={userId} />
          </Suspense>
        </div>
      </div>

      {/* Main Content - Schedule & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Schedule (2/3 width) */}
        <div className="lg:col-span-2">
          <Suspense fallback={<DashboardLoader message="Loading schedule..." />}>
            <StudentSchedule studentId={userId} />
          </Suspense>
        </div>

        {/* RIGHT - Results & Upcoming (1/3 width) */}
        <div className="space-y-6">
          <Suspense fallback={<DashboardLoader message="Loading results..." />}>
            <RecentResults studentId={userId} />
          </Suspense>
          
          <Suspense fallback={<DashboardLoader message="Loading upcoming work..." />}>
            <UpcomingWork studentId={userId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
