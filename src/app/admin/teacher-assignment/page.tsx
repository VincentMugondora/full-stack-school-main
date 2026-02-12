"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface Teacher {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Class {
  id: string;
  name: string;
  grade: string;
  teacherId: string | null;
  teacher: {
    id: string;
    user: {
      name: string | null;
    };
  } | null;
}

interface Subject {
  id: string;
  name: string;
  teacherId: string | null;
  teacher: {
    id: string;
    user: {
      name: string | null;
    };
  } | null;
}

export default function AdminTeacherAssignmentPage() {
  const { getToken } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"classes" | "subjects">("classes");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const schoolId = "default-school"; // Replace with actual school ID logic

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [teachersRes, classesRes, subjectsRes] = await Promise.all([
          fetch(`/api/teachers?schoolId=${schoolId}`, { headers }),
          fetch(`/api/classes?schoolId=${schoolId}`, { headers }),
          fetch(`/api/subjects?schoolId=${schoolId}`, { headers }),
        ]);

        if (!teachersRes.ok || !classesRes.ok || !subjectsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [teachersData, classesData, subjectsData] = await Promise.all([
          teachersRes.json(),
          classesRes.json(),
          subjectsRes.json(),
        ]);

        setTeachers(teachersData.teachers || []);
        setClasses(classesData.classes || []);
        setSubjects(subjectsData.subjects || []);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken, schoolId]);

  const assignTeacherToClass = async (classId: string, teacherId: string | null) => {
    try {
      const token = await getToken();
      const response = await fetch("/api/classes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: classId, teacherId }),
      });

      if (!response.ok) throw new Error("Failed to assign teacher");

      // Update local state
      setClasses(classes.map((c) => (c.id === classId ? { ...c, teacherId, teacher: teacherId ? teachers.find((t) => t.id === teacherId)?.user : null } : c)));
    } catch (err) {
      alert("Failed to assign teacher to class");
    }
  };

  const assignTeacherToSubject = async (subjectId: string, teacherId: string | null) => {
    try {
      const token = await getToken();
      const response = await fetch("/api/subjects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: subjectId, teacherId }),
      });

      if (!response.ok) throw new Error("Failed to assign teacher");

      // Update local state
      setSubjects(subjects.map((s) => (s.id === subjectId ? { ...s, teacherId, teacher: teacherId ? teachers.find((t) => t.id === teacherId)?.user : null } : s)));
    } catch (err) {
      alert("Failed to assign teacher to subject");
    }
  };

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
      <h1 className="text-3xl font-bold mb-8">Teacher Assignment Dashboard</h1>

      <div className="mb-6">
        <div className="flex space-x-4 border-b">
          <button
            className={`pb-2 px-4 ${activeTab === "classes" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
            onClick={() => setActiveTab("classes")}
          >
            Assign to Classes
          </button>
          <button
            className={`pb-2 px-4 ${activeTab === "subjects" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
            onClick={() => setActiveTab("subjects")}
          >
            Assign to Subjects
          </button>
        </div>
      </div>

      {activeTab === "classes" && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Teacher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Teacher</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{cls.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cls.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cls.teacher?.user?.name || "Unassigned"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="border rounded px-3 py-2"
                      value={cls.teacherId || ""}
                      onChange={(e) => assignTeacherToClass(cls.id, e.target.value || null)}
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.user.name || teacher.user.email}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "subjects" && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Teacher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Teacher</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{subject.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{subject.teacher?.user?.name || "Unassigned"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="border rounded px-3 py-2"
                      value={subject.teacherId || ""}
                      onChange={(e) => assignTeacherToSubject(subject.id, e.target.value || null)}
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.user.name || teacher.user.email}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
