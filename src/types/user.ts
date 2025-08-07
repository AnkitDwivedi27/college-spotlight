export type UserRole = 'admin' | 'organizer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  organizerId: string;
  organizerName: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredStudents: string[];
  attendedStudents: string[];
  maxCapacity?: number;
  category?: string;
}

export interface Feedback {
  id: string;
  eventId: string;
  studentId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  eventId: string;
  studentId: string;
  issuedAt: string;
  downloadUrl?: string;
}