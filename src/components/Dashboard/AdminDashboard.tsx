import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Users, Calendar, Clock, MapPin, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  created_by: string;
  organizer_name?: string;
  max_participants?: number;
  category: string;
  priority: number;
  approval_status?: string;
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100 }
  }
};

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
        organizer_name: event.profiles?.full_name || 'Unknown'
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

  const handlePriorityUpdate = async (eventId: string, newPriority: number) => {
    setUpdating(eventId);
    try {
      const { error } = await supabase
        .from('events')
        .update({ priority: newPriority })
        .eq('id', eventId);
      
      if (error) throw error;
      
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, priority: newPriority }
            : event
        )
      );
      
      toast({
        title: "Priority updated successfully",
        description: `Event priority has been set to ${newPriority}.`,
      });
    } catch (error) {
      toast({
        title: "Error updating priority",
        description: error instanceof Error ? error.message : "Failed to update priority",
        variant: "destructive"
      });
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

  const handleApprovalUpdate = async (eventId: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(eventId);
    try {
      const { error } = await supabase
        .from('events')
        .update({ approval_status: newStatus })
        .eq('id', eventId);
      
      if (error) throw error;
      
      await fetchEvents();
      
      toast({
        title: `Event ${newStatus}`,
        description: `The event has been ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error updating approval status",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingEvents = events.filter(e => e.approval_status === 'pending');
  const approvedEvents = events.filter(e => e.approval_status === 'approved');
  const todayEvents = events.filter(e => 
    new Date(e.event_date).toDateString() === new Date().toDateString()
  );
  
  const stats = {
    totalEvents: events.length,
    pendingEvents: pendingEvents.length,
    todayEvents: todayEvents.length,
    totalUsers: users.length
  };

  return (
    <motion.div 
      className="min-h-screen p-4 md:p-8 space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Manage events, users, and system-wide settings</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-card rounded-lg border border-border">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-medium">System Overview</span>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Events</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalEvents}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-warning">{stats.pendingEvents}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-full group-hover:scale-110 transition-transform">
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Today's Events</p>
                <p className="text-3xl font-bold text-success">{stats.todayEvents}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full group-hover:scale-110 transition-transform">
                <Clock className="h-8 w-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-full group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Event Management */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Event Management</CardTitle>
            </div>
            <CardDescription>
              Review and approve pending events, manage priorities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No events found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...pendingEvents, ...approvedEvents].map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-gradient-card border-border hover:shadow-card transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                              {event.approval_status && getStatusBadge(event.approval_status)}
                              {event.category && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  {event.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">{event.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(event.event_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{event.start_time} - {event.end_time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{event.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>By {event.organizer_name}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-row lg:flex-col gap-3 items-start">
                            {event.approval_status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprovalUpdate(event.id, 'approved')}
                                  disabled={updating === event.id}
                                  className="bg-success hover:bg-success/90"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApprovalUpdate(event.id, 'rejected')}
                                  disabled={updating === event.id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-muted-foreground">Priority</span>
                              <Select
                                value={event.priority.toString()}
                                onValueChange={(value) => handlePriorityUpdate(event.id, parseInt(value))}
                                disabled={updating === event.id}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                  <SelectItem value="4">4</SelectItem>
                                  <SelectItem value="5">5</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* User Management */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>
              Manage user roles and permissions across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="bg-gradient-card border-border hover:shadow-card transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-lg">
                                {profile.full_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{profile.full_name}</p>
                              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                              {profile.department && (
                                <p className="text-xs text-muted-foreground mt-1">{profile.department}</p>
                              )}
                            </div>
                          </div>
                          <Select
                            value={profile.role}
                            onValueChange={(newRole) => handleRoleUpdate(profile.user_id, newRole as 'admin' | 'organizer' | 'student')}
                          >
                            <SelectTrigger className="w-32 flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="organizer">Organizer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
