import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from '@/components/Dashboard/AdminDashboard';
import OrganizerDashboard from '@/components/Dashboard/OrganizerDashboard';
import StudentDashboard from '@/components/Dashboard/StudentDashboard';
import Navbar from '@/components/Layout/Navbar';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'organizer':
        return <OrganizerDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return <div>Invalid user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;