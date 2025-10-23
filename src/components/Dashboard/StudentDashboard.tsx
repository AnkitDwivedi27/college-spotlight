import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, MapPin, Users, Award, MessageSquare } from 'lucide-react';

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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [eventCapacities, setEventCapacities] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
  }, [user]);

  useEffect(() => {
    if (events.length > 0) {
      fetchAllEventCapacities();
    }
  }, [events]);

  // Add realtime subscription for capacity updates
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
          // Refresh capacities when any registration changes
          fetchAllEventCapacities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const fetchAllEventCapacities = async () => {
    const capacities: Record<string, number> = {};
    if (events.length === 0) {
      setEventCapacities(capacities);
      return;
    }

    // Fetch counts in parallel for better performance
    const promises = events.map(async (event) => {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);
      capacities[event.id] = count || 0;
    });

    await Promise.all(promises);
    setEventCapacities(capacities);
  };

  const handleRegister = async (eventId: string) => {
    if (!user) return;
    
    setRegistering(eventId);
    try {
      const event = events.find(e => e.id === eventId);

      const { error } = await supabase
        .from('event_registrations')
        .insert([{
          user_id: user.id,
          event_id: eventId,
          status: 'registered'
        }]);

      if (error) {
        // Check if it's a capacity error from the database trigger
        if (error.message.includes('Event is full')) {
          toast({
            title: "Unable to Register",
            description: `Sorry, "${event?.title}" has reached its maximum capacity. Registration is closed.`,
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setRegistering(null);
        await fetchAllEventCapacities(); // Refresh capacity display
        return;
      }

      await fetchRegistrations();
      await fetchAllEventCapacities();

      toast({
        title: "Registration Successful",
        description: `You have registered for "${event?.title}". See you there!`,
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register for event",
        variant: "destructive"
      });
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
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const myRegisteredEvents = events.filter(event => isRegistered(event.id));
  const availableEvents = events.filter(event => !isRegistered(event.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Discover and register for exciting events</p>
        </div>
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium">My Learning Journey</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Events</p>
                <p className="text-2xl font-bold text-primary">{availableEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Registrations</p>
                <p className="text-2xl font-bold text-success">{myRegisteredEvents.length}</p>
              </div>
              <Users className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-accent">{events.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Events */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Available Events</span>
          </CardTitle>
          <CardDescription>
            Discover and register for upcoming events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableEvents.map((event) => (
              <div key={event.id} className="p-4 border border-border rounded-lg bg-gradient-card hover:shadow-card transition-smooth">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                    {event.category && (
                      <Badge variant="outline" className="text-xs">{event.category}</Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-sm">{event.description}</p>
                  
                  <div className="space-y-2 text-sm">
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
                    {event.max_participants && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {eventCapacities[event.id] || 0} / {event.max_participants} registered
                          {getRemainingCapacity(event) !== null && (
                            <span className={`ml-2 font-semibold ${isEventFull(event) ? 'text-destructive' : 'text-success'}`}>
                              ({getRemainingCapacity(event)} spots left)
                            </span>
                          )}
                        </span>
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
              </div>
            ))}
            
            {availableEvents.length === 0 && (
              <div className="col-span-2 text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No available events to register for at the moment.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Registered Events */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>My Registered Events</CardTitle>
          <CardDescription>Events you have registered for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myRegisteredEvents.map((event) => (
              <div key={event.id} className="p-4 border border-border rounded-lg bg-gradient-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                      <Badge className="bg-success/10 text-success border-success/20">
                        Registered
                      </Badge>
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
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUnregister(event.id)}
                    >
                      Unregister
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {myRegisteredEvents.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You haven't registered for any events yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;