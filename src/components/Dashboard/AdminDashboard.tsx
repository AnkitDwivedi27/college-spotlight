import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Users, Calendar, Clock, MapPin, BarChart3 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  organizer_name?: string;
  max_participants?: number;
  category: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'organizer' | 'student';
  department?: string;
  year_of_study?: number;
}

const AdminDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const eventsWithOrganizerName = data.map(event => ({
        ...event,
        organizer_name: event.profiles?.full_name || 'Unknown',
        approval_status: event.approval_status as 'pending' | 'approved' | 'rejected'
      }));
      
      setEvents(eventsWithOrganizerName as Event[]);
    } catch (error) {
      toast({
        title: "Error fetching events",
        description: error instanceof Error ? error.message : "Failed to load events",
        variant: "destructive"
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers((data || []).map(profile => ({
        ...profile,
        role: profile.role as 'admin' | 'organizer' | 'student'
      })));
    } catch (error) {
      toast({
        title: "Error fetching users",
        description: error instanceof Error ? error.message : "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (eventId: string, action: 'approve' | 'reject') => {
    setUpdating(eventId);
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          approval_status: action === 'approve' ? 'approved' : 'rejected' 
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      // Optimistically update the local state instead of refetching all events
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, approval_status: action === 'approve' ? 'approved' : 'rejected' }
            : event
        )
      );
      
      toast({
        title: `Event ${action}d successfully`,
        description: `The event has been ${action}d and remains in the system.`,
      });
    } catch (error) {
      toast({
        title: `Error ${action}ing event`,
        description: error instanceof Error ? error.message : `Failed to ${action} event`,
        variant: "destructive"
      });
      // If there's an error, refetch to ensure consistency
      await fetchEvents();
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'organizer' | 'student') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      await fetchUsers();
      
      toast({
        title: "Role updated successfully",
        description: `User role has been updated to ${newRole}.`,
      });
    } catch (error) {
      toast({
        title: "Error updating role",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalEvents: events.length,
    pendingEvents: events.filter(e => e.approval_status === 'pending').length,
    approvedEvents: events.filter(e => e.approval_status === 'approved').length,
    totalUsers: users.length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage events and users across the platform</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Overview</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-warning">{stats.pendingEvents}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Events</p>
                <p className="text-2xl font-bold text-success">{stats.approvedEvents}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Event Management</span>
          </CardTitle>
          <CardDescription>
            Review and manage all event submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="p-4 border border-border rounded-lg bg-gradient-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                      {getStatusBadge(event.approval_status)}
                    </div>
                    <p className="text-muted-foreground mb-3">{event.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Category: {event.category}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Organized by: <span className="font-medium">{event.organizer_name}</span>
                    </div>
                  </div>
                  
                  {event.approval_status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleEventAction(event.id, 'approve')}
                        disabled={updating === event.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {updating === event.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleEventAction(event.id, 'reject')}
                        disabled={updating === event.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {updating === event.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {events.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No events found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </CardTitle>
          <CardDescription>
            Overview of all platform users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white font-medium">
                      {profile.full_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    {profile.department && (
                      <p className="text-xs text-muted-foreground">{profile.department}</p>
                    )}
                  </div>
                </div>
                <Select
                  value={profile.role}
                  onValueChange={(newRole) => handleRoleUpdate(profile.user_id, newRole as 'admin' | 'organizer' | 'student')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No users found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;