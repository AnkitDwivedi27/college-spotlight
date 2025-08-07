import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, LogOut, Calendar, Users, BarChart3 } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'organizer': return 'warning';
      case 'student': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <nav className="bg-gradient-card shadow-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">EduEvents</h1>
              <p className="text-xs text-muted-foreground">College Event Management</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-destructive/10 text-destructive' :
                      user.role === 'organizer' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;