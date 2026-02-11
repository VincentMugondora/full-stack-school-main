import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getUserWithRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTeacherSchedule, getTeacherClasses } from "@/lib/dashboard-data";
import { DashboardLoader, DashboardError, EmptyState } from "@/components/dashboard/DashboardStates";
import { Calendar, Users, CheckSquare, FileText, BookOpen } from "lucide-react";
import Link from "next/link";

// Schedule Component
async function TeacherSchedule({ teacherId }: { teacherId: string }) {
  try {
    const lessons = await getTeacherSchedule(teacherId);

    if (lessons.length === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Weekly Schedule</h3>
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="No lessons assigned"
            message="Your teaching schedule will appear here once lessons are assigned"
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Weekly Schedule</h3>
          <span className="text-sm text-gray-500">{lessons.length} lessons/week</span>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[600px]">
          {days.map((day) => {
            const dayLessons = lessonsByDay[day] || [];
            if (dayLessons.length === 0) return null;

            return (
              <div key={day} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">{day}</h4>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <div key={lesson.id} className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{lesson.subject}</p>
                          <p className="text-sm text-gray-600">{lesson.class}</p>
                        </div>
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                          {new Date(lesson.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                          {new Date(lesson.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

// My Classes Component
async function MyClasses({ teacherId }: { teacherId: string }) {
  try {
    const classes = await getTeacherClasses(teacherId);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">My Classes</h3>
        </div>
        
        {classes.length === 0 ? (
          <EmptyState
            title="No classes assigned"
            message="Classes you supervise will appear here"
          />
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{cls.name}</p>
                    <p className="text-sm text-gray-500">Grade {cls.grade} • {cls.studentCount} students</p>
                  </div>
                  <Link
                    href={`/list/students?classId=${cls.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load classes" />;
  }
}

// Quick Actions Component
function QuickActions() {
  const actions = [
    { icon: CheckSquare, label: "Attendance", href: "/list/attendance", color: "bg-green-100 text-green-600" },
    { icon: FileText, label: "Exams", href: "/list/exams", color: "bg-blue-100 text-blue-600" },
    { icon: BookOpen, label: "Assignments", href: "/list/assignments", color: "bg-purple-100 text-purple-600" },
    { icon: FileText, label: "Results", href: "/list/results", color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className={`p-3 rounded-full ${action.color} mb-2`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Main Teacher Page Component
const TeacherPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getUserWithRole(userId);

  if (!user || user.role !== "teacher") {
    redirect(`/${user?.role || "sign-in"}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user.username}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Schedule (2/3 width) */}
        <div className="lg:col-span-2">
          <Suspense fallback={<DashboardLoader message="Loading schedule..." />}>
            <TeacherSchedule teacherId={userId} />
          </Suspense>
        </div>

        {/* RIGHT - Classes & Actions (1/3 width) */}
        <div className="space-y-6">
          <Suspense fallback={<DashboardLoader message="Loading classes..." />}>
            <MyClasses teacherId={userId} />
          </Suspense>
          
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default TeacherPage;
