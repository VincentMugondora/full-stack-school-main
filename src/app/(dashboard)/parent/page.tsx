import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getUserWithRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getParentChildren, getChildResults, getChildAttendanceStats, getStudentSchedule } from "@/lib/dashboard-data";
import { DashboardLoader, DashboardError, EmptyState } from "@/components/dashboard/DashboardStates";
import { Users, CheckCircle, TrendingUp, Calendar, GraduationCap, ChevronRight } from "lucide-react";
import prisma from "@/lib/prisma";

// Child Selector Component
async function ChildSelector({ parentId, selectedChildId }: { parentId: string; selectedChildId?: string }) {
  try {
    const children = await getParentChildren(parentId);

    if (children.length === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No children linked"
            message="Your children will appear here once linked to your account"
          />
        </div>
      );
    }

    const activeChild = children.find(c => c.id === selectedChildId) || children[0];

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">My Children</h3>
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                child.id === activeChild.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-100 hover:border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    child.id === activeChild.id ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-semibold ${child.id === activeChild.id ? "text-blue-900" : "text-gray-800"}`}>
                      {child.name} {child.surname}
                    </p>
                    <p className="text-sm text-gray-500">{child.className}</p>
                  </div>
                </div>
                {child.id === activeChild.id && <ChevronRight className="w-5 h-5 text-blue-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load children" />;
  }
}

// Child Schedule Component
async function ChildSchedule({ childId }: { childId: string }) {
  try {
    const lessons = await getStudentSchedule(childId);
    if (lessons.length === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Class Schedule</h3>
          <EmptyState icon={<Calendar className="w-12 h-12" />} title="No schedule available" 
            message="Schedule will appear once the child is assigned to a class" />
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
          <h3 className="text-lg font-semibold text-gray-800">Class Schedule</h3>
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
                          {lesson.teacherName && <p className="text-xs text-gray-500">👤 {lesson.teacherName}</p>}
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

// Child Attendance Card
async function ChildAttendance({ childId }: { childId: string }) {
  try {
    const stats = await getChildAttendanceStats(childId);
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Attendance</h3>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" stroke="#e5e7eb" strokeWidth="10" fill="none" />
              <circle cx="56" cy="56" r="48" stroke="#22c55e" strokeWidth="10" fill="none" 
                strokeDasharray={`${stats.percentage * 3.02} 302`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-800">{stats.percentage}%</span>
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

// Child Results Component
async function ChildResults({ childId }: { childId: string }) {
  try {
    const results = await getChildResults(childId);
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recent Results</h3>
        </div>
        {results.length === 0 ? (
          <EmptyState title="No results yet" message="Results will appear here once available" />
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
                  }`}>{result.score}%</span>
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

// Child Overview Card
async function ChildOverview({ childId }: { childId: string }) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: childId },
      include: { class: { include: { grade: true, supervisor: true } } },
    });
    if (!student) return null;
    const results = await prisma.result.findMany({ where: { studentId: childId } });
    const avgScore = results.length > 0 
      ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

    return (
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-md text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{student.name} {student.surname}</h2>
            <p className="text-purple-100">{student.class.name} • Grade {student.grade.level}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-purple-100 text-xs">Class Teacher</p>
            <p className="text-lg font-semibold">{student.class.supervisor?.name || "TBD"}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-purple-100 text-xs">Average Score</p>
            <p className="text-lg font-semibold">{avgScore > 0 ? `${avgScore}%` : "N/A"}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-purple-100 text-xs">Total Results</p>
            <p className="text-lg font-semibold">{results.length}</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return null;
  }
}

// Main Parent Page Component
const ParentPage = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  
  const user = await getUserWithRole(userId);
  if (!user || user.role !== "parent") redirect(`/${user?.role || "sign-in"}`);

  const children = await getParentChildren(userId);
  const activeChild = children[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <p className="text-gray-500">Monitor your child's academic progress</p>
      </div>

      <Suspense fallback={<DashboardLoader message="Loading children..." />}>
        <ChildSelector parentId={userId} selectedChildId={activeChild?.id} />
      </Suspense>

      {activeChild && (
        <>
          <Suspense fallback={<DashboardLoader message="Loading overview..." />}>
            <ChildOverview childId={activeChild.id} />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Suspense fallback={<DashboardLoader message="Loading schedule..." />}>
                <ChildSchedule childId={activeChild.id} />
              </Suspense>
            </div>
            <div className="space-y-6">
              <Suspense fallback={<DashboardLoader message="Loading attendance..." />}>
                <ChildAttendance childId={activeChild.id} />
              </Suspense>
              <Suspense fallback={<DashboardLoader message="Loading results..." />}>
                <ChildResults childId={activeChild.id} />
              </Suspense>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParentPage;
