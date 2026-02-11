import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getUserWithRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminDashboardData, getRecentEvents, getAnnouncements } from "@/lib/dashboard-data";
import { DashboardLoader, DashboardError, EmptyState } from "@/components/dashboard/DashboardStates";
import { Users, GraduationCap, UserCircle, UsersRound, Calendar, Bell } from "lucide-react";

// User Cards Component with real data
async function UserCards() {
  try {
    const { counts } = await getAdminDashboardData();
    
    const cards = [
      { type: "admin", count: counts.admins, icon: Users, color: "bg-blue-100 text-blue-600", label: "Admins" },
      { type: "teacher", count: counts.teachers, icon: GraduationCap, color: "bg-orange-100 text-orange-600", label: "Teachers" },
      { type: "student", count: counts.students, icon: UserCircle, color: "bg-green-100 text-green-600", label: "Students" },
      { type: "parent", count: counts.parents, icon: UsersRound, color: "bg-purple-100 text-purple-600", label: "Parents" },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.type} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800">{card.count}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load user counts" />;
  }
}

// Demographics Chart with Student Gender Distribution
async function DemographicsChart() {
  try {
    const { demographics } = await getAdminDashboardData();
    
    // Dynamic import for Recharts to avoid SSR issues
    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = await import("recharts");
    
    const data = [
      { name: "Male Students", value: demographics.maleStudents, color: "#60a5fa" },
      { name: "Female Students", value: demographics.femaleStudents, color: "#f472b6" },
    ];

    const total = demographics.maleStudents + demographics.femaleStudents;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Student Demographics</h3>
          <span className="text-sm text-gray-500">Total: {total}</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} students`, ""]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load demographics" />;
  }
}

// Attendance Trend Chart
async function AttendanceChart() {
  try {
    const { attendance } = await getAdminDashboardData();
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = await import("recharts");

    if (attendance.length === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px]">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Weekly Attendance</h3>
          <EmptyState 
            icon={<Users className="w-12 h-12" />}
            title="No attendance data" 
            message="Attendance records will appear here once recorded"
          />
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Weekly Attendance</h3>
          <span className="text-sm text-gray-500">Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={attendance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { weekday: "short" })}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, "Attendance"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line 
              type="monotone" 
              dataKey="percentage" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }} 
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load attendance data" />;
  }
}

// Finance Chart Placeholder (per PRD - Admin only feature)
async function FinanceChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Finance Overview</h3>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Coming Soon</span>
      </div>
      <EmptyState
        icon={<div className="text-4xl">💰</div>}
        title="Financial Reports"
        message="Income and expense tracking will be available in a future update"
      />
    </div>
  );
}

// Upcoming Events List
async function EventsList() {
  try {
    const events = await getRecentEvents(5);
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Upcoming Events</h3>
        </div>
        {events.length === 0 ? (
          <EmptyState 
            title="No upcoming events" 
            message="Events will appear here once scheduled"
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{event.title}</p>
                    <p className="text-sm text-gray-500">{event.className || "School-wide"}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {new Date(event.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                  {new Date(event.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load events" />;
  }
}

// Announcements List
async function AnnouncementsList() {
  try {
    const announcements = await getAnnouncements(5);
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Announcements</h3>
        </div>
        {announcements.length === 0 ? (
          <EmptyState 
            title="No announcements" 
            message="Announcements will appear here once posted"
          />
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <p className="font-medium text-gray-800 line-clamp-1">{announcement.title}</p>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{announcement.description}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(announcement.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <DashboardError message="Failed to load announcements" />;
  }
}

// Main Admin Page Component
const AdminPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getUserWithRole(userId);

  if (!user || user.role !== "admin") {
    redirect(`/${user?.role || "sign-in"}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500">School overview and management</p>
      </div>

      {/* USER STATISTICS CARDS */}
      <Suspense fallback={<DashboardLoader message="Loading user statistics..." />}>
        <UserCards />
      </Suspense>

      {/* MIDDLE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Suspense fallback={<DashboardLoader message="Loading demographics..." />}>
            <DemographicsChart />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<DashboardLoader message="Loading attendance..." />}>
            <AttendanceChart />
          </Suspense>
        </div>
      </div>

      {/* FINANCE CHART */}
      <Suspense fallback={<DashboardLoader message="Loading finance data..." />}>
        <FinanceChart />
      </Suspense>

      {/* RIGHT COLUMN - EVENTS & ANNOUNCEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<DashboardLoader message="Loading events..." />}>
          <EventsList />
        </Suspense>
        <Suspense fallback={<DashboardLoader message="Loading announcements..." />}>
          <AnnouncementsList />
        </Suspense>
      </div>
    </div>
  );
};

export default AdminPage;
