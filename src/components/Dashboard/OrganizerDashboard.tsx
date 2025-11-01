import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Calendar, Clock, MapPin, Users, CheckCircle2, Trash2, Award, Mail, CheckCircle, XCircle } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  created_by: string;
  max_participants?: number;
  category: string;
  created_at: string;
  approval_status?: string;
  teacher_name?: string;
  teacher_email?: string;
}

interface EventRegistration {
  id: string;
  user_id: string;
  event_id: string;
  registered_at: string;
  status: string;
  roll_number?: string;
  is_present?: boolean;
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
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<Event[]>([]);
  const [timeSlotConflict, setTimeSlotConflict] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<Array<{start: string, end: string}>>([]);
  const [certificates, setCertificates] = useState<Record<string, Set<string>>>({});
  const [issuingCertificate, setIssuingCertificate] = useState<string | null>(null);
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    max_participants: '',
    category: '',
    teacherName: '',
    teacherEmail: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
    fetchCertificates();
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
      setEvents(data || []);
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

  const fetchCertificates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('event_id, user_id');
      
      if (error) throw error;
      
      const certMap: Record<string, Set<string>> = {};
      data?.forEach(cert => {
        if (!certMap[cert.event_id]) {
          certMap[cert.event_id] = new Set();
        }
        certMap[cert.event_id].add(cert.user_id);
      });
      
      setCertificates(certMap);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const handleToggleAttendance = async (registrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ is_present: !currentStatus })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance ${!currentStatus ? 'marked' : 'unmarked'}`,
      });

      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendAttendanceEmail = async (eventId: string) => {
    setSendingEmail(true);
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");
      
      if (!event.teacher_email || !event.teacher_name) {
        throw new Error("Teacher details not found for this event");
      }

      const eventRegistrations = registrations.filter(r => r.event_id === eventId && r.is_present);
      
      if (eventRegistrations.length === 0) {
        throw new Error("No students marked as present");
      }

      const presentStudents = eventRegistrations.map(reg => ({
        name: reg.profiles?.full_name || 'Unknown',
        rollNumber: reg.roll_number || 'N/A',
        email: reg.profiles?.email || 'N/A'
      }));

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase.functions.invoke('send-attendance-email', {
        body: {
          teacherName: event.teacher_name,
          teacherEmail: event.teacher_email,
          eventName: event.title,
          eventDate: new Date(event.event_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          eventTime: `${event.start_time || ''} - ${event.end_time || ''}`,
          organizerName: profileData?.full_name || 'Event Organizer',
          presentStudents
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance email sent to ${event.teacher_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleIssueCertificate = async (eventId: string, userId: string, studentName: string) => {
    if (!user) return;
    
    const registration = registrations.find(
      r => r.event_id === eventId && r.user_id === userId
    );
    
    if (!registration?.is_present) {
      toast({
        title: "Cannot Issue Certificate",
        description: "Certificate can only be issued to students who attended the event.",
        variant: "destructive"
      });
      return;
    }
    
    const key = `${eventId}-${userId}`;
    setIssuingCertificate(key);
    
    try {
      const { error } = await supabase
        .from('certificates')
        .insert({
          event_id: eventId,
          user_id: userId,
          issued_by: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Issued",
            description: `Certificate for ${studentName} has already been issued.`,
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        await fetchCertificates();
        toast({
          title: "Certificate Issued",
          description: `Certificate issued to ${studentName} successfully!`,
        });
      }
    } catch (error) {
      toast({
        title: "Error issuing certificate",
        description: error instanceof Error ? error.message : "Failed to issue certificate",
        variant: "destructive"
      });
    } finally {
      setIssuingCertificate(null);
    }
  };

  const hasCertificate = (eventId: string, userId: string) => {
    return certificates[eventId]?.has(userId) || false;
  };

  const fetchEventsOnDate = async (date: string) => {
    if (!date) {
      setEventsOnSelectedDate([]);
      return;
    }

    try {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('approval_status', 'approved')
        .gte('event_date', selectedDate.toISOString())
        .lt('event_date', new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      setEventsOnSelectedDate(data || []);
    } catch (error) {
      console.error('Error fetching events on date:', error);
    }
  };

  const checkTimeSlotConflict = (date: string, startTime: string, endTime: string) => {
    if (!date || !startTime || !endTime) return false;

    const hasConflict = eventsOnSelectedDate.some(event => {
      const eventStart = event.start_time;
      const eventEnd = event.end_time;
      
      return (
        (startTime <= eventStart && endTime > eventStart) ||
        (startTime < eventEnd && endTime >= eventEnd) ||
        (startTime >= eventStart && endTime <= eventEnd)
      );
    });

    setTimeSlotConflict(hasConflict);
    
    if (hasConflict) {
      generateSuggestedSlots(date);
    } else {
      setSuggestedSlots([]);
    }
    
    return hasConflict;
  };

  const generateSuggestedSlots = (date: string) => {
    const suggestions: Array<{start: string, end: string}> = [];
    const workingHours = { start: '09:00', end: '18:00' };
    
    const sortedEvents = [...eventsOnSelectedDate].sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = sortedEvents[i].end_time;
      const nextStart = sortedEvents[i + 1].start_time;
      
      const gap = getTimeDifferenceInMinutes(currentEnd, nextStart);
      if (gap >= 60) {
        suggestions.push({
          start: currentEnd,
          end: nextStart
        });
      }
    }

    if (sortedEvents.length > 0) {
      const firstEventStart = sortedEvents[0].start_time;
      const gap = getTimeDifferenceInMinutes(workingHours.start, firstEventStart);
      if (gap >= 60) {
        suggestions.unshift({
          start: workingHours.start,
          end: firstEventStart
        });
      }
    }

    if (sortedEvents.length > 0) {
      const lastEventEnd = sortedEvents[sortedEvents.length - 1].end_time;
      const gap = getTimeDifferenceInMinutes(lastEventEnd, workingHours.end);
      if (gap >= 60) {
        suggestions.push({
          start: lastEventEnd,
          end: workingHours.end
        });
      }
    }

    if (sortedEvents.length === 0) {
      suggestions.push({
        start: workingHours.start,
        end: workingHours.end
      });
    }

    setSuggestedSlots(suggestions.slice(0, 3));
  };

  const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  useEffect(() => {
    if (newEvent.event_date) {
      fetchEventsOnDate(newEvent.event_date);
    }
  }, [newEvent.event_date]);

  useEffect(() => {
    if (newEvent.event_date && newEvent.start_time && newEvent.end_time) {
      checkTimeSlotConflict(newEvent.event_date, newEvent.start_time, newEvent.end_time);
    }
  }, [newEvent.event_date, newEvent.start_time, newEvent.end_time, eventsOnSelectedDate]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
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

      if (!user?.id) {
        throw new Error('You must be logged in to create events');
      }

      const eventDate = new Date(newEvent.event_date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Please enter a valid date and time');
      }

      if (eventDate <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_date: eventDate.toISOString(),
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        location: newEvent.location.trim(),
        max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
        category: newEvent.category.trim(),
        teacher_name: newEvent.teacherName.trim() || null,
        teacher_email: newEvent.teacherEmail.trim() || null,
        created_by: user.id
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
        start_time: '09:00',
        end_time: '10:00',
        location: '',
        max_participants: '',
        category: '',
        teacherName: '',
        teacherEmail: ''
      });
      setShowCreateForm(false);

      const createdEvent = data?.[0];
      const isApproved = createdEvent?.approval_status === 'approved';

      toast({
        title: isApproved ? "Event Auto-Approved!" : "Event Submitted",
        description: isApproved 
          ? "No time slot conflict detected. Your event is live!" 
          : "Time slot conflict detected. Your event is pending admin approval.",
        variant: isApproved ? "default" : "default"
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
                <p className="text-sm font-medium text-muted-foreground">Active Events</p>
                <p className="text-2xl font-bold text-success">{events.length}</p>
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
                  <Select value={newEvent.category} onValueChange={(value) => setNewEvent(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="event_date">Event Date</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherName">Teacher Name</Label>
                  <Input
                    id="teacherName"
                    value={newEvent.teacherName}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, teacherName: e.target.value }))}
                    placeholder="Prof. Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherEmail">Teacher Email</Label>
                  <Input
                    id="teacherEmail"
                    type="email"
                    value={newEvent.teacherEmail}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, teacherEmail: e.target.value }))}
                    placeholder="teacher@gehu.ac.in"
                  />
                </div>
              </div>

              {/* Time Slot Availability Info */}
              {newEvent.event_date && (
                <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
                  <h4 className="font-semibold text-sm text-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Events scheduled on {new Date(newEvent.event_date).toLocaleDateString()}
                  </h4>
                  
                  {eventsOnSelectedDate.length > 0 ? (
                    <div className="space-y-2">
                      {eventsOnSelectedDate.map(event => (
                        <div key={event.id} className="text-sm p-2 bg-background/50 rounded flex items-center justify-between">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground">{event.start_time} - {event.end_time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-success">✓ No events scheduled - All time slots available!</p>
                  )}

                  {timeSlotConflict && (
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded">
                      <p className="text-sm font-semibold text-warning mb-2">⚠ Time slot conflict detected!</p>
                      {suggestedSlots.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Available time slots:</p>
                          {suggestedSlots.map((slot, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setNewEvent(prev => ({
                                  ...prev,
                                  start_time: slot.start,
                                  end_time: slot.end
                                }));
                              }}
                              className="w-full text-left text-sm p-2 bg-background hover:bg-primary/10 rounded border border-border transition-colors"
                            >
                              {slot.start} - {slot.end}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!timeSlotConflict && newEvent.start_time && newEvent.end_time && (
                    <p className="text-sm text-success">✓ This time slot is available!</p>
                  )}
                </div>
              )}

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
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                        {event.approval_status && getStatusBadge(event.approval_status)}
                      </div>
                      <p className="text-muted-foreground mb-3">{event.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{event.start_time} - {event.end_time}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Registrations: {eventRegistrations.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>

                  {eventRegistrations.length > 0 && (
                    <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Registered Students ({eventRegistrations.length})</h4>
                        <div className="flex space-x-2">
                          {selectedEventForAttendance === event.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEventForAttendance(null)}
                            >
                              Hide Attendance
                            </Button>
                          )}
                          {selectedEventForAttendance !== event.id && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedEventForAttendance(event.id)}
                            >
                              Mark Attendance
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                          >
                            {selectedEvent === event.id ? 'Hide' : 'View'} Details
                          </Button>
                        </div>
                      </div>
                      
                      {selectedEvent === event.id && (
                        <div className="space-y-2">
                          {eventRegistrations.map((registration) => {
                            const certIssued = hasCertificate(event.id, registration.user_id);
                            const isIssuing = issuingCertificate === `${event.id}-${registration.user_id}`;
                            
                            return (
                              <div key={registration.id} className="flex items-center justify-between p-3 bg-background rounded border">
                                <div className="flex-1">
                                  <span className="font-medium">{registration.profiles.full_name}</span>
                                  <p className="text-sm text-muted-foreground">{registration.profiles.email}</p>
                                  {registration.roll_number && (
                                    <p className="text-xs text-muted-foreground">Roll: {registration.roll_number}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Registered on {new Date(registration.registered_at).toLocaleDateString()}
                                  </p>
                                </div>
                                
                                {selectedEventForAttendance === event.id && (
                                  <Button
                                    size="sm"
                                    variant={registration.is_present ? "default" : "outline"}
                                    onClick={() => handleToggleAttendance(registration.id, registration.is_present || false)}
                                    className="ml-2"
                                  >
                                    {registration.is_present ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Present
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Absent
                                      </>
                                    )}
                                  </Button>
                                )}

                                {!selectedEventForAttendance && registration.is_present && (
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Attended
                                    </Badge>
                                    {certIssued ? (
                                      <Badge className="bg-success/10 text-success border-success/20">
                                        <Award className="h-3 w-3 mr-1" />
                                        Certificate Issued
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleIssueCertificate(event.id, registration.user_id, registration.profiles.full_name)}
                                        disabled={isIssuing}
                                      >
                                        <Award className="h-4 w-4 mr-1" />
                                        {isIssuing ? 'Issuing...' : 'Issue Certificate'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {eventRegistrations.some((r: EventRegistration) => r.is_present) && (
                        <Button
                          className="w-full mt-3"
                          variant="default"
                          onClick={() => handleSendAttendanceEmail(event.id)}
                          disabled={sendingEmail || !event.teacher_email}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {sendingEmail ? 'Sending...' : 'Send Attendance to Teacher'}
                        </Button>
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
