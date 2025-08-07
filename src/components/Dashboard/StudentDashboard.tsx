import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { mockEvents, mockFeedback, mockCertificates } from '@/data/mockData';
import { Event, Feedback } from '@/types/user';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, MapPin, Users, Star, Download, Award, MessageSquare } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedback);
  const [certificates] = useState(mockCertificates);
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });
  const { toast } = useToast();

  const approvedEvents = events.filter(e => e.status === 'approved');
  const myRegisteredEvents = events.filter(e => e.registeredStudents.includes(user!.id));
  const myAttendedEvents = events.filter(e => e.attendedStudents.includes(user!.id));
  const availableEvents = approvedEvents.filter(e => !e.registeredStudents.includes(user!.id));

  const handleRegister = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, registeredStudents: [...event.registeredStudents, user!.id] }
        : event
    ));

    const event = events.find(e => e.id === eventId);
    toast({
      title: "Registration Successful",
      description: `You have registered for "${event?.title}". See you there!`,
    });
  };

  const handleUnregister = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, registeredStudents: event.registeredStudents.filter(id => id !== user!.id) }
        : event
    ));

    const event = events.find(e => e.id === eventId);
    toast({
      title: "Unregistered",
      description: `You have unregistered from "${event?.title}".`,
      variant: "destructive",
    });
  };

  const handleSubmitFeedback = (eventId: string) => {
    const newFeedback: Feedback = {
      id: Date.now().toString(),
      eventId,
      studentId: user!.id,
      rating: feedbackForm.rating,
      comment: feedbackForm.comment,
      createdAt: new Date().toISOString()
    };

    setFeedbacks(prev => [...prev, newFeedback]);
    setSelectedEventForFeedback(null);
    setFeedbackForm({ rating: 5, comment: '' });

    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback! Your certificate will be available shortly.",
    });
  };

  const hasSubmittedFeedback = (eventId: string) => {
    return feedbacks.some(f => f.eventId === eventId && f.studentId === user!.id);
  };

  const hasCertificate = (eventId: string) => {
    return certificates.some(c => c.eventId === eventId && c.studentId === user!.id);
  };

  const canDownloadCertificate = (eventId: string) => {
    return myAttendedEvents.some(e => e.id === eventId) && hasSubmittedFeedback(eventId);
  };

  const renderStars = (rating: number, onRate?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            } ${onRate ? 'cursor-pointer' : ''}`}
            onClick={() => onRate && onRate(star)}
          />
        ))}
      </div>
    );
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Registered</p>
                <p className="text-2xl font-bold text-primary">{myRegisteredEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attended</p>
                <p className="text-2xl font-bold text-success">{myAttendedEvents.length}</p>
              </div>
              <Users className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Feedback Given</p>
                <p className="text-2xl font-bold text-accent">{feedbacks.filter(f => f.studentId === user!.id).length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Certificates</p>
                <p className="text-2xl font-bold text-warning">{certificates.filter(c => c.studentId === user!.id).length}</p>
              </div>
              <Award className="h-8 w-8 text-warning" />
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
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{event.registeredStudents.length} registered</span>
                      {event.maxCapacity && <span>/ {event.maxCapacity} max</span>}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleRegister(event.id)}
                    className="w-full"
                    disabled={event.maxCapacity ? event.registeredStudents.length >= event.maxCapacity : false}
                  >
                    {event.maxCapacity && event.registeredStudents.length >= event.maxCapacity 
                      ? 'Event Full' 
                      : 'Register Now'
                    }
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
                      {event.attendedStudents.includes(user!.id) && (
                        <Badge className="bg-success/10 text-success border-success/20">
                          Attended
                        </Badge>
                      )}
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
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    {/* Feedback and Certificate Actions */}
                    {event.attendedStudents.includes(user!.id) && !hasSubmittedFeedback(event.id) && (
                      <Button 
                        variant="warning" 
                        size="sm"
                        onClick={() => setSelectedEventForFeedback(event.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Give Feedback
                      </Button>
                    )}
                    
                    {canDownloadCertificate(event.id) && (
                      <Button variant="success" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Certificate
                      </Button>
                    )}
                    
                    {!event.attendedStudents.includes(user!.id) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUnregister(event.id)}
                      >
                        Unregister
                      </Button>
                    )}
                  </div>
                </div>

                {/* Feedback Form */}
                {selectedEventForFeedback === event.id && (
                  <div className="mt-4 p-4 bg-secondary/20 rounded-lg border border-border">
                    <h4 className="font-medium mb-3">Submit Feedback</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Rating</Label>
                        {renderStars(feedbackForm.rating, (rating) => setFeedbackForm(prev => ({ ...prev, rating })))}
                      </div>
                      <div>
                        <Label>Comments</Label>
                        <Textarea
                          value={feedbackForm.comment}
                          onChange={(e) => setFeedbackForm(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder="Share your experience..."
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleSubmitFeedback(event.id)}>
                          Submit Feedback
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEventForFeedback(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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