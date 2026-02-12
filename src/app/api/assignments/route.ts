import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user to check their role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, studentId: true, teacherId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let assignments;
    
    if (user.role === 'STUDENT') {
      // For students, return their class assignments
      const student = await prisma.student.findUnique({
        where: { id: user.studentId || '' },
        select: { classId: true }
      });

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      assignments = await prisma.assignment.findMany({
        where: { 
          classId: student.classId,
          dueDate: { gte: new Date() } // Only show upcoming assignments
        },
        include: {
          lesson: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          },
          class: { select: { name: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 20
      });
    } else if (user.role === 'TEACHER') {
      // For teachers, return assignments they've created
      assignments = await prisma.assignment.findMany({
        where: { 
          lesson: { teacherId: user.teacherId || '' },
          dueDate: { gte: new Date() } // Only show upcoming assignments
        },
        include: {
          lesson: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          },
          class: { select: { name: true } },
          _count: {
            select: {
              submissions: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 20
      });
    } else {
      // For admins, return all assignments
      assignments = await prisma.assignment.findMany({
        where: { 
          dueDate: { gte: new Date() } // Only show upcoming assignments
        },
        include: {
          lesson: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          },
          class: { select: { name: true } },
          _count: {
            select: {
              submissions: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 50
      });
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, classId, title, description, dueDate, maxScore } = await request.json();

    // Create new assignment
    const assignment = await prisma.assignment.create({
      data: {
        lessonId,
        classId,
        title,
        description,
        dueDate: new Date(dueDate),
        maxScore: parseFloat(maxScore)
      }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
