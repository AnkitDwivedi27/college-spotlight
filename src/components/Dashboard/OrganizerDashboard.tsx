import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockEvents, mockUsers } from '@/data/mockData';
import { Event } from '@/types/user';
import { useAuth } from '@/context/AuthContext';
import { Plus, Calendar, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';

const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(mockEvents.filter(e => e.organizerId === user?.id));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    maxCapacity: '',
    category: ''
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const event: Event = {
      id: Date.now().toString(),
      ...newEvent,
      maxCapacity: parseInt(newEvent.maxCapacity) || undefined,
      organizerId: user!.id,
      organizerName: user!.name,
      status: 'pending',
      registeredStudents: [],
      attendedStudents: []
    };

    setEvents(prev => [...prev, event]);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      venue: '',
      maxCapacity: '',
      category: ''
    });
    setShowCreateForm(false);

    toast({
      title: "Event Created",
      description: "Your event has been submitted for admin approval.",
    });
  };

  const handleMarkAttendance = (eventId: string, studentId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            attendedStudents: event.attendedStudents.includes(studentId) 
              ? event.attendedStudents.filter(id => id !== studentId)
              : [...event.attendedStudents, studentId]
          }
        : event
    ));

    toast({
      title: "Attendance Updated",
      description: "Student attendance has been recorded.",
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

  const getRegisteredStudents = (studentIds: string[]) => {
    return mockUsers.filter(user => studentIds.includes(user.id) && user.role === 'student');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organizer Dashboard</h1>
          <p className="text-muted-foreground">Create and manage your events</p>
        </div>
        <Button 
          variant="hero" 
          onClick={() => setShowCreateForm(true)}
          className="shadow-glow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Events</p>
                <p className="text-2xl font-bold text-foreground">{events.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-success">{events.filter(e => e.status === 'approved').length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Registrations</p>
                <p className="text-2xl font-bold text-foreground">
                  {events.reduce((sum, event) => sum + event.registeredStudents.length, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <Card className="shadow-elegant border-primary/20">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>Fill in the details for your new event</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newEvent.category}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Technology, Career, Environment"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your event"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCapacity">Max Capacity</Label>
                  <Input
                    id="maxCapacity"
                    type="number"
                    value={newEvent.maxCapacity}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, maxCapacity: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Event location"
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" variant="success">Create Event</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My Events */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>My Events</CardTitle>
          <CardDescription>Manage your created events and track attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="p-4 border border-border rounded-lg bg-gradient-card">
                <div className="flex items-start justify-between mb-3">
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
                  </div>
                </div>

                {event.status === 'approved' && event.registeredStudents.length > 0 && (
                  <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Registered Students ({event.registeredStudents.length})</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                      >
                        {selectedEvent === event.id ? 'Hide' : 'Manage'} Attendance
                      </Button>
                    </div>
                    
                    {selectedEvent === event.id && (
                      <div className="space-y-2">
                        {getRegisteredStudents(event.registeredStudents).map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-background rounded border">
                            <span className="font-medium">{student.name}</span>
                            <Button
                              variant={event.attendedStudents.includes(student.id) ? "success" : "outline"}
                              size="sm"
                              onClick={() => handleMarkAttendance(event.id, student.id)}
                            >
                              {event.attendedStudents.includes(student.id) ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Present
                                </>
                              ) : (
                                'Mark Present'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {events.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No events created yet. Create your first event!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboard;