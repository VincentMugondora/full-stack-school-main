"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Subject {
  id: string;
  name: string;
}

interface TeacherData {
  id: string;
  classes: Class[];
  subjects: Subject[];
}

export default function TeacherDashboardPage() {
  const { getToken } = useAuth();
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolId = "default-school"; // Replace with actual school ID logic

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch classes assigned to this teacher
        const classesRes = await fetch(`/api/classes?schoolId=${schoolId}`, { headers });
        const subjectsRes = await fetch(`/api/subjects?schoolId=${schoolId}`, { headers });

        if (!classesRes.ok || !subjectsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();

        setTeacherData({
          id: "",
          classes: classesData.classes || [],
          subjects: subjectsData.subjects || [],
        });
      } catch (err) {
        setError("Failed to load your assignments");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken, schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Teaching Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Classes Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600">My Classes</h2>
          {teacherData?.classes && teacherData.classes.length > 0 ? (
            <div className="space-y-4">
              {teacherData.classes.map((cls) => (
                <div key={cls.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{cls.name}</h3>
                      <p className="text-gray-600">Grade: {cls.grade}</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                      View Class
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No classes assigned to you yet.
            </div>
          )}
        </div>

        {/* Subjects Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-green-600">My Subjects</h2>
          {teacherData?.subjects && teacherData.subjects.length > 0 ? (
            <div className="space-y-4">
              {teacherData.subjects.map((subject) => (
                <div key={subject.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{subject.name}</h3>
                      <p className="text-gray-600">Subject Teacher</p>
                    </div>
                    <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                      View Subject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No subjects assigned to you yet.
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{teacherData?.classes?.length || 0}</div>
          <div className="text-sm text-gray-600">Classes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{teacherData?.subjects?.length || 0}</div>
          <div className="text-sm text-gray-600">Subjects</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">-</div>
          <div className="text-sm text-gray-600">Students</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">-</div>
          <div className="text-sm text-gray-600">Lessons</div>
        </div>
      </div>
    </div>
  );
}
