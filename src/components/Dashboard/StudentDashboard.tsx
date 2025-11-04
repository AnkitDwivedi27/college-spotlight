import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, MapPin, Users, Award, TrendingUp, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CertificateTemplate } from '@/components/Certificate/CertificateTemplate';

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
}

interface Certificate {
  id: string;
  event_id: string;
  user_id: string;
  issued_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [eventCapacities, setEventCapacities] = useState<Record<string, number>>({});
  const [selectedCertificate, setSelectedCertificate] = useState<{
    eventId: string;
    eventName: string;
    issuedDate: string;
  } | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [showRollNumberDialog, setShowRollNumberDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
    fetchCertificates();
  }, [user]);

  useEffect(() => {
    if (events.length > 0) {
      fetchAllEventCapacities();
    }
  }, [events]);

  useEffect(() => {
    if (!events.length) return;

    const channel = supabase
      .channel('event-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations'
        },
        (payload) => {
          console.log('Registration change detected:', payload);
          fetchAllEventCapacities();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    const pollInterval = setInterval(() => {
      fetchAllEventCapacities();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [events]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('approval_status', 'approved')
        .order('event_date', { ascending: true });
      
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
    }
  };

  const fetchRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const fetchAllEventCapacities = async () => {
    const capacities: Record<string, number> = {};
    if (events.length === 0) {
      setEventCapacities(capacities);
      return;
    }

    const eventIds = events.map(e => e.id);
    const { data, error } = await supabase.rpc('get_event_registration_counts', {
      p_event_ids: eventIds
    });

    if (error) {
      console.error('Error fetching event capacities:', error);
      return;
    }

    data?.forEach((item: { event_id: string; registration_count: number }) => {
      capacities[item.event_id] = item.registration_count;
    });

    setEventCapacities(capacities);
  };

  const handleRegister = async (eventId: string) => {
    setSelectedEventId(eventId);
    setShowRollNumberDialog(true);
  };

  const handleRegisterWithRollNumber = async () => {
    if (!user || !selectedEventId) return;

    if (!rollNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your roll number",
        variant: "destructive",
      });
      return;
    }

    setRegistering(selectedEventId);
    try {
      const event = events.find(e => e.id === selectedEventId);

      const { error } = await supabase
        .from('event_registrations')
        .insert([{
          user_id: user.id,
          event_id: selectedEventId,
          status: 'registered',
          roll_number: rollNumber.trim()
        }]);

      if (error) {
        if (error.message.includes('Event is full')) {
          toast({
            title: "Unable to Register",
            description: `Sorry, "${event?.title}" has reached its maximum capacity. Registration is closed.`,
            variant: "destructive"
          });
          await fetchAllEventCapacities();
        } else {
          throw error;
        }
        setRegistering(null);
        setShowRollNumberDialog(false);
        setRollNumber('');
        setSelectedEventId(null);
        return;
      }

      await fetchRegistrations();
      await fetchAllEventCapacities();

      toast({
        title: "Registration Successful",
        description: `You have registered for "${event?.title}". See you there!`,
      });

      setShowRollNumberDialog(false);
      setRollNumber('');
      setSelectedEventId(null);
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register for event",
        variant: "destructive"
      });
      await fetchAllEventCapacities();
    } finally {
      setRegistering(null);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId);

      if (error) throw error;

      await fetchRegistrations();
      await fetchAllEventCapacities();

      const event = events.find(e => e.id === eventId);
      toast({
        title: "Unregistered",
        description: `You have unregistered from "${event?.title}".`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Unregistration Failed",
        description: error instanceof Error ? error.message : "Failed to unregister from event",
        variant: "destructive"
      });
    }
  };

  const isRegistered = (eventId: string) => {
    return registrations.some(reg => reg.event_id === eventId);
  };

  const hasCertificate = (eventId: string) => {
    return certificates.some(cert => cert.event_id === eventId);
  };

  const getRemainingCapacity = (event: Event) => {
    if (!event.max_participants) return null;
    const registered = eventCapacities[event.id] || 0;
    return event.max_participants - registered;
  };

  const isEventFull = (event: Event) => {
    const remaining = getRemainingCapacity(event);
    return remaining !== null && remaining <= 0;
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

  const myRegisteredEvents = events.filter(event => isRegistered(event.id));
  const availableEvents = events.filter(event => !isRegistered(event.id));

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
            Student Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Discover and register for exciting campus events</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-card rounded-lg border border-border">
          <TrendingUp className="h-5 w-5 text-accent" />
          <span className="font-medium">My Learning Journey</span>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Available Events</p>
                <p className="text-3xl font-bold text-primary">{availableEvents.length}</p>
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
                <p className="text-sm font-medium text-muted-foreground mb-1">My Registrations</p>
                <p className="text-3xl font-bold text-success">{myRegisteredEvents.length}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full group-hover:scale-110 transition-transform">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-elegant border-border overflow-hidden group hover:shadow-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Certificates</p>
                <p className="text-3xl font-bold text-accent">{certificates.length}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-full group-hover:scale-110 transition-transform">
                <Award className="h-8 w-8 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Available Events */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Available Events</CardTitle>
            </div>
            <CardDescription>
              Browse and register for upcoming campus events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No available events at the moment</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full bg-gradient-card border-border hover:shadow-card transition-all duration-300 group">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                            {event.category && (
                              <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(event.event_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(event.event_date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{event.location}</span>
                            </div>
                            {event.max_participants && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {eventCapacities[event.id] || 0} / {event.max_participants} registered
                                </span>
                                {getRemainingCapacity(event) !== null && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      isEventFull(event) 
                                        ? 'bg-destructive/10 text-destructive border-destructive/20' 
                                        : 'bg-success/10 text-success border-success/20'
                                    }`}
                                  >
                                    {getRemainingCapacity(event)} spots left
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            onClick={() => handleRegister(event.id)}
                            className="w-full"
                            disabled={registering === event.id || isEventFull(event)}
                          >
                            {isEventFull(event) 
                              ? 'Event Full' 
                              : registering === event.id 
                                ? 'Registering...' 
                                : 'Register Now'}
                          </Button>
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

      {/* My Registered Events */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <CardTitle>My Registered Events</CardTitle>
            </div>
            <CardDescription>
              Events you have signed up for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myRegisteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No registrations yet</p>
                <p className="text-sm text-muted-foreground mt-2">Register for an event to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRegisteredEvents.map((event, index) => {
                  const certIssued = hasCertificate(event.id);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-gradient-card border-border hover:shadow-card transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                                <Badge className="bg-success/10 text-success border-success/20">
                                  Registered
                                </Badge>
                                {certIssued && (
                                  <Badge className="bg-accent/10 text-accent border-accent/20 flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    Certificate Available
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm">{event.description}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(event.event_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{new Date(event.event_date).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-row lg:flex-col gap-2">
                              {certIssued && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => {
                                    const cert = certificates.find(c => c.event_id === event.id);
                                    setSelectedCertificate({
                                      eventId: event.id,
                                      eventName: event.title,
                                      issuedDate: cert?.issued_at || new Date().toISOString()
                                    });
                                  }}
                                  className="flex-1 lg:flex-none"
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  View Certificate
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUnregister(event.id)}
                                className="flex-1 lg:flex-none"
                              >
                                Unregister
                              </Button>
                            </div>
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

      {/* Roll Number Dialog */}
      <Dialog open={showRollNumberDialog} onOpenChange={setShowRollNumberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Roll Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number</Label>
              <Input
                id="rollNumber"
                placeholder="Enter your roll number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRegisterWithRollNumber();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRollNumberDialog(false);
              setRollNumber('');
              setSelectedEventId(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleRegisterWithRollNumber} disabled={!rollNumber.trim()}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      {selectedCertificate && (
        <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Your Certificate</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <CertificateTemplate
                eventName={selectedCertificate.eventName}
                studentName={user?.name || user?.email || 'Student'}
                issuedDate={new Date(selectedCertificate.issuedDate).toLocaleDateString()}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
};

export default StudentDashboard;
