import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockEvents, mockUsers } from '@/data/mockData';
import { Event } from '@/types/user';
import { CheckCircle, XCircle, Users, Calendar, Clock, MapPin, BarChart3 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const { toast } = useToast();

  const handleEventAction = (eventId: string, action: 'approve' | 'reject') => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, status: action === 'approve' ? 'approved' : 'rejected' } : event
    ));
    
    const event = events.find(e => e.id === eventId);
    toast({
      title: action === 'approve' ? 'Event Approved' : 'Event Rejected',
      description: `"${event?.title}" has been ${action}d successfully.`,
      variant: action === 'approve' ? 'default' : 'destructive',
    });
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

  const stats = {
    totalEvents: events.length,
    pendingEvents: events.filter(e => e.status === 'pending').length,
    approvedEvents: events.filter(e => e.status === 'approved').length,
    totalUsers: mockUsers.length
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
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="text-muted-foreground mb-3">{event.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{event.venue}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Organized by: <span className="font-medium">{event.organizerName}</span>
                    </div>
                  </div>
                  
                  {event.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleEventAction(event.id, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleEventAction(event.id, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
            {mockUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Badge className={`${
                  user.role === 'admin' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                  user.role === 'organizer' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-success/10 text-success border-success/20'
                }`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;