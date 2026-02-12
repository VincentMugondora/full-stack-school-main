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
      select: { role: true, studentId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let attendance;
    
    if (user.role === 'STUDENT') {
      // For students, only return their own attendance
      attendance = await prisma.attendance.findMany({
        where: { studentId: user.studentId },
        include: {
          student: {
            select: { name: true, surname: true }
          },
          lesson: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 20
      });
    } else {
      // For teachers/admins, return all attendance
      attendance = await prisma.attendance.findMany({
        include: {
          student: {
            select: { name: true, surname: true }
          },
          lesson: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 50
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
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

    const { studentId, lessonId, date, present, notes } = await request.json();

    // Check if attendance already exists for this student and lesson on this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        lessonId,
        date: new Date(date)
      }
    });

    let attendance;

    if (existingAttendance) {
      // Update existing attendance
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          present,
          notes
        }
      });
    } else {
      // Create new attendance
      attendance = await prisma.attendance.create({
        data: {
          studentId,
          lessonId,
          date: new Date(date),
          present,
          notes
        }
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 }
    );
  }
}
