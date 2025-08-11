import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Calendar, Clock, MapPin, Users, CheckCircle2, Trash2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  max_participants?: number;
  category: string;
  created_at: string;
}

interface EventRegistration {
  id: string;
  user_id: string;
  event_id: string;
  registered_at: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    max_participants: '',
    category: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEvents((data || []).map(event => ({
        ...event,
        approval_status: event.approval_status as 'pending' | 'approved' | 'rejected'
      })));
    } catch (error) {
      toast({
        title: "Error fetching events",
        description: error instanceof Error ? error.message : "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          profiles:user_id (full_name, email),
          events:event_id (created_by)
        `)
        .eq('events.created_by', user.id);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Validate required fields
      if (!newEvent.title.trim()) {
        throw new Error('Event title is required');
      }
      if (!newEvent.event_date) {
        throw new Error('Event date and time is required');
      }
      if (!newEvent.location.trim()) {
        throw new Error('Location is required');
      }
      if (!newEvent.category.trim()) {
        throw new Error('Category is required');
      }

      // Ensure we have a valid user
      if (!user?.id) {
        throw new Error('You must be logged in to create events');
      }

      // Parse and validate the date
      const eventDate = new Date(newEvent.event_date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Please enter a valid date and time');
      }

      // Check if the date is in the future
      if (eventDate <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_date: eventDate.toISOString(),
        location: newEvent.location.trim(),
        max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
        category: newEvent.category.trim(),
        created_by: user.id,
        approval_status: 'pending' as const
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Database error occurred');
      }

      await fetchEvents();
      
      setNewEvent({
        title: '',
        description: '',
        event_date: '',
        location: '',
        max_participants: '',
        category: ''
      });
      setShowCreateForm(false);

      toast({
        title: "Event Created",
        description: "Your event has been submitted for admin approval.",
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error creating event",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('created_by', user!.id);

      if (error) throw error;

      await fetchEvents();

      toast({
        title: "Event Deleted",
        description: "The event has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error deleting event",
        description: error instanceof Error ? error.message : "Failed to delete event",
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

  const getRegistrationsForEvent = (eventId: string) => {
    return registrations.filter(reg => reg.event_id === eventId);
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

  const approvedEvents = events.filter(e => e.approval_status === 'approved');
  const totalRegistrations = registrations.length;

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
                <p className="text-2xl font-bold text-success">{approvedEvents.length}</p>
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
                <p className="text-2xl font-bold text-foreground">{totalRegistrations}</p>
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
                    required
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Date & Time</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Max Capacity</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={newEvent.max_participants}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, max_participants: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" variant="success" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Event'}
                </Button>
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
          <CardDescription>Manage your created events and track registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => {
              const eventRegistrations = getRegistrationsForEvent(event.id);
              
              return (
                <div key={event.id} className="p-4 border border-border rounded-lg bg-gradient-card">
                  <div className="flex items-start justify-between mb-3">
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
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(event.event_date).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    {event.approval_status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>

                  {event.approval_status === 'approved' && eventRegistrations.length > 0 && (
                    <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Registered Students ({eventRegistrations.length})</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                        >
                          {selectedEvent === event.id ? 'Hide' : 'View'} Registrations
                        </Button>
                      </div>
                      
                      {selectedEvent === event.id && (
                        <div className="space-y-2">
                          {eventRegistrations.map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-2 bg-background rounded border">
                              <div>
                                <span className="font-medium">{registration.profiles.full_name}</span>
                                <p className="text-sm text-muted-foreground">{registration.profiles.email}</p>
                              </div>
                              <Badge variant="outline">
                                Registered on {new Date(registration.registered_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
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