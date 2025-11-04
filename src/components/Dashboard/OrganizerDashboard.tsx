import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Calendar, Clock, MapPin, Users, CheckCircle2, X, Award, Mail, Save, TrendingUp, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

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

const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<string | null>(null);
  const [attendanceChanges, setAttendanceChanges] = useState<Record<string, boolean>>({});
  const [attendanceSaved, setAttendanceSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [issuingAllCertificates, setIssuingAllCertificates] = useState(false);
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
    category: 'general',
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

  const handleAttendanceChange = (registrationId: string, isPresent: boolean) => {
    setAttendanceChanges(prev => ({
      ...prev,
      [registrationId]: isPresent
    }));
  };

  const handleSaveAttendance = async (eventId: string) => {
    setSavingAttendance(true);
    try {
      const updates = Object.entries(attendanceChanges).map(([registrationId, isPresent]) => 
        supabase
          .from('event_registrations')
          .update({ is_present: isPresent })
          .eq('id', registrationId)
      );

      await Promise.all(updates);

      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });

      setAttendanceChanges({});
      setAttendanceSaved(prev => new Set([...prev, eventId]));
      setSelectedEventForAttendance(null);
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingAttendance(false);
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

  const handleIssueAllCertificates = async (eventId: string) => {
    if (!user) return;
    
    const presentStudents = registrations.filter(
      r => r.event_id === eventId && r.is_present
    );
    
    if (presentStudents.length === 0) {
      toast({
        title: "No Students Present",
        description: "No students marked as present to issue certificates.",
        variant: "destructive"
      });
      return;
    }

    setIssuingAllCertificates(true);
    
    try {
      const certificatesToIssue = presentStudents
        .filter(student => !hasCertificate(eventId, student.user_id))
        .map(student => ({
          event_id: eventId,
          user_id: student.user_id,
          issued_by: user.id
        }));

      if (certificatesToIssue.length === 0) {
        toast({
          title: "Already Issued",
          description: "All present students have already received certificates.",
        });
        return;
      }

      const { error } = await supabase
        .from('certificates')
        .insert(certificatesToIssue);

      if (error) throw error;

      await fetchCertificates();
      toast({
        title: "Certificates Issued",
        description: `Successfully issued ${certificatesToIssue.length} certificate(s)!`,
      });
    } catch (error) {
      toast({
        title: "Error issuing certificates",
        description: error instanceof Error ? error.message : "Failed to issue certificates",
        variant: "destructive"
      });
    } finally {
      setIssuingAllCertificates(false);
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
        throw new Error('Event date is required');
      }
      if (!newEvent.location.trim()) {
        throw new Error('Location is required');
      }

      const eventDate = new Date(newEvent.event_date);
      
      const { error } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title.trim(),
          description: newEvent.description.trim(),
          event_date: eventDate.toISOString(),
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          location: newEvent.location.trim(),
          created_by: user?.id,
          max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
          category: newEvent.category.trim() || 'general',
          priority: 1,
          approval_status: timeSlotConflict ? 'pending' : 'approved',
          teacher_name: newEvent.teacherName.trim() || null,
          teacher_email: newEvent.teacherEmail.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: timeSlotConflict ? "Event Submitted for Approval" : "Event Created",
        description: timeSlotConflict 
          ? "Your event has time slot conflicts. It will be reviewed by an administrator."
          : "Your event has been created successfully!",
      });

      setNewEvent({
        title: '',
        description: '',
        event_date: '',
        start_time: '09:00',
        end_time: '10:00',
        location: '',
        max_participants: '',
        category: 'general',
        teacherName: '',
        teacherEmail: ''
      });
      setShowCreateForm(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error creating event",
        description: error?.message || "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
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
  const totalRegistrations = registrations.length;
  const eventWithMostRegistrations = events.reduce((max, event) => {
    const count = registrations.filter(r => r.event_id === event.id).length;
    return count > max.count ? { event, count } : max;
  }, { event: null as Event | null, count: 0 });

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
            Organizer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Create and manage your events</p>
        </div>
        <Button 
          size="lg"
          onClick={() => setShowCreateForm(true)}
          className="shadow-glow"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Event
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Events</p>
                <p className="text-3xl font-bold text-foreground">{events.length}</p>
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
                <p className="text-3xl font-bold text-warning">{pendingEvents.length}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-full group-hover:scale-110 transition-transform">
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Registrations</p>
                <p className="text-3xl font-bold text-success">{totalRegistrations}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Most Popular</p>
                <p className="text-xl font-bold text-accent truncate">
                  {eventWithMostRegistrations.event?.title || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">{eventWithMostRegistrations.count} registrations</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-full group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* My Events */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>My Events</CardTitle>
            </div>
            <CardDescription>
              Manage your created events and track registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No events created yet</p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">Create your first event to get started!</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => {
                  const eventRegs = registrations.filter(r => r.event_id === event.id);
                  const presentCount = eventRegs.filter(r => r.is_present).length;
                  const hasAttendanceSaved = attendanceSaved.has(event.id) || eventRegs.some(r => r.is_present !== null);
                  const hasTeacherDetails = event.teacher_email && event.teacher_name;
                  const canSendEmail = hasAttendanceSaved && presentCount > 0 && hasTeacherDetails;
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-gradient-card border-border hover:shadow-card transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-xl font-semibold text-foreground">{event.title}</h3>
                                  {event.approval_status === 'approved' && (
                                    <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>
                                  )}
                                  {event.approval_status === 'pending' && (
                                    <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>
                                  )}
                                  {event.approval_status === 'rejected' && (
                                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>
                                  )}
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
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-foreground font-medium">{eventRegs.length}</span>
                                    <span className="text-muted-foreground">
                                      {event.max_participants ? `/ ${event.max_participants}` : ''} registered
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-row lg:flex-col gap-2 flex-wrap">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedEventForAttendance(event.id)}
                                  className="flex-1 lg:flex-none lg:min-w-[140px]"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark Attendance
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleSendAttendanceEmail(event.id)}
                                  disabled={!canSendEmail || sendingEmail}
                                  className="flex-1 lg:flex-none lg:min-w-[140px]"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send to Teacher
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleIssueAllCertificates(event.id)}
                                  disabled={!hasAttendanceSaved || presentCount === 0 || issuingAllCertificates}
                                  className="flex-1 lg:flex-none lg:min-w-[140px]"
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  Issue Certificates
                                </Button>
                              </div>
                            </div>
                            
                            {presentCount > 0 && (
                              <div className="flex items-center gap-2 text-sm bg-success/5 text-success p-2 rounded-md border border-success/20">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{presentCount} student{presentCount !== 1 ? 's' : ''} marked present</span>
                              </div>
                            )}
                            
                            {!hasTeacherDetails && (
                              <div className="flex items-center gap-2 text-sm bg-warning/5 text-warning p-2 rounded-md border border-warning/20">
                                <AlertCircle className="h-4 w-4" />
                                <span>Add teacher details to enable email feature</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Event Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Create New Event</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new event
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newEvent.category} onValueChange={(v) => setNewEvent({ ...newEvent, category: v })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Describe your event"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date *</Label>
                <Input
                  type="date"
                  id="event_date"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  type="time"
                  id="start_time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  type="time"
                  id="end_time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {timeSlotConflict && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">Time Slot Conflict Detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This time slot conflicts with existing events. Your event will require admin approval.
                    </p>
                  </div>
                </div>
                {suggestedSlots.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Suggested Available Slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSlots.map((slot, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewEvent({
                              ...newEvent,
                              start_time: slot.start,
                              end_time: slot.end
                            });
                          }}
                          className="text-xs"
                        >
                          {slot.start} - {slot.end}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Enter location"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_participants">Max Participants</Label>
                <Input
                  type="number"
                  id="max_participants"
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent({...newEvent, max_participants: e.target.value})}
                  placeholder="Leave blank for unlimited"
                  min="1"
                />
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="font-medium">Teacher Details (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherName">Teacher Name</Label>
                  <Input
                    id="teacherName"
                    value={newEvent.teacherName}
                    onChange={(e) => setNewEvent({...newEvent, teacherName: e.target.value})}
                    placeholder="Enter teacher name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacherEmail">Teacher Email</Label>
                  <Input
                    type="email"
                    id="teacherEmail"
                    value={newEvent.teacherEmail}
                    onChange={(e) => setNewEvent({...newEvent, teacherEmail: e.target.value})}
                    placeholder="teacher@example.com"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      {selectedEventForAttendance && (
        <Dialog open={!!selectedEventForAttendance} onOpenChange={() => setSelectedEventForAttendance(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                {events.find(e => e.id === selectedEventForAttendance)?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {registrations
                .filter(r => r.event_id === selectedEventForAttendance)
                .map((reg) => {
                  const currentStatus = attendanceChanges[reg.id] ?? reg.is_present ?? false;
                  
                  return (
                    <Card key={reg.id} className="bg-gradient-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{reg.profiles?.full_name || 'Unknown Student'}</p>
                            <p className="text-sm text-muted-foreground">{reg.profiles?.email}</p>
                            {reg.roll_number && (
                              <p className="text-xs text-muted-foreground mt-1">Roll: {reg.roll_number}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`present-${reg.id}`}
                                checked={currentStatus}
                                onCheckedChange={(checked) => 
                                  handleAttendanceChange(reg.id, checked === true)
                                }
                              />
                              <Label 
                                htmlFor={`present-${reg.id}`}
                                className="cursor-pointer"
                              >
                                Present
                              </Label>
                            </div>
                            
                            {hasCertificate(selectedEventForAttendance, reg.user_id) ? (
                              <Badge className="bg-accent/10 text-accent border-accent/20">
                                <Award className="h-3 w-3 mr-1" />
                                Issued
                              </Badge>
                            ) : currentStatus ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIssueCertificate(
                                  selectedEventForAttendance, 
                                  reg.user_id, 
                                  reg.profiles?.full_name || 'Student'
                                )}
                                disabled={issuingCertificate === `${selectedEventForAttendance}-${reg.user_id}`}
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Issue Cert
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
              {registrations.filter(r => r.event_id === selectedEventForAttendance).length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No registrations for this event yet</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEventForAttendance(null)}>
                Close
              </Button>
              <Button 
                onClick={() => handleSaveAttendance(selectedEventForAttendance)}
                disabled={savingAttendance || Object.keys(attendanceChanges).length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                {savingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
};

export default OrganizerDashboard;
