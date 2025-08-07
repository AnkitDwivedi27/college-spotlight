import { User, Event, Feedback, Certificate } from '@/types/user';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'admin@college.edu',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Prof. Michael Chen',
    email: 'organizer@college.edu',
    role: 'organizer'
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'student1@college.edu',
    role: 'student'
  },
  {
    id: '4',
    name: 'James Rodriguez',
    email: 'student2@college.edu',
    role: 'student'
  },
  {
    id: '5',
    name: 'Dr. Lisa Park',
    email: 'organizer2@college.edu',
    role: 'organizer'
  }
];

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Annual Tech Symposium',
    description: 'Join us for a comprehensive exploration of emerging technologies and their impact on society.',
    date: '2024-08-15',
    time: '09:00',
    venue: 'Main Auditorium',
    organizerId: '2',
    organizerName: 'Prof. Michael Chen',
    status: 'approved',
    registeredStudents: ['3', '4'],
    attendedStudents: ['3'],
    maxCapacity: 200,
    category: 'Technology'
  },
  {
    id: '2',
    title: 'Career Development Workshop',
    description: 'Interactive session on resume building, interview skills, and career planning.',
    date: '2024-08-20',
    time: '14:00',
    venue: 'Conference Room A',
    organizerId: '5',
    organizerName: 'Dr. Lisa Park',
    status: 'pending',
    registeredStudents: [],
    attendedStudents: [],
    maxCapacity: 50,
    category: 'Career'
  },
  {
    id: '3',
    title: 'Environmental Awareness Seminar',
    description: 'Learn about sustainable practices and environmental conservation efforts.',
    date: '2024-08-25',
    time: '11:00',
    venue: 'Lecture Hall B',
    organizerId: '2',
    organizerName: 'Prof. Michael Chen',
    status: 'approved',
    registeredStudents: ['4'],
    attendedStudents: [],
    maxCapacity: 100,
    category: 'Environment'
  },
  {
    id: '4',
    title: 'Student Research Showcase',
    description: 'Students present their innovative research projects and findings.',
    date: '2024-08-30',
    time: '10:00',
    venue: 'Student Center',
    organizerId: '5',
    organizerName: 'Dr. Lisa Park',
    status: 'rejected',
    registeredStudents: [],
    attendedStudents: [],
    maxCapacity: 150,
    category: 'Research'
  }
];

export const mockFeedback: Feedback[] = [
  {
    id: '1',
    eventId: '1',
    studentId: '3',
    rating: 5,
    comment: 'Excellent presentations and very informative content!',
    createdAt: '2024-08-15T16:00:00Z'
  }
];

export const mockCertificates: Certificate[] = [
  {
    id: '1',
    eventId: '1',
    studentId: '3',
    issuedAt: '2024-08-15T17:00:00Z'
  }
];