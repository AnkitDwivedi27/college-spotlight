import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  Users,
  Award,
  ChevronRight,
  BookOpen,
  Clock,
  Shield,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: "Event Management",
      description: "Create, manage, and track college events seamlessly",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Different dashboards for admins, organizers, and students",
    },
    {
      icon: Award,
      title: "Digital Certificates",
      description: "Automatic certificate generation after event completion",
    },
    {
      icon: BookOpen,
      title: "Feedback System",
      description: "Collect and analyze event feedback from participants",
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Live event status updates and notifications",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Protected access with role-based authentication",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/app.jpg')" }} // Change to your image path
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="mx-auto bg-white/10 backdrop-blur-sm p-6 rounded-3xl w-fit">
                <GraduationCap className="h-16 w-16 text-white mx-auto" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                EduEvents
              </h1>
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
                The complete College Event Management System for organizing,
                managing, and participating in educational events
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/login")}
                className="text-lg px-8 py-4 shadow-glow"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-foreground">
              Everything You Need for Event Management
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From event creation to certificate generation, our platform
              handles every aspect of college event management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-gradient-card shadow-card hover:shadow-elegant transition-smooth border-0"
              >
                <CardHeader className="text-center space-y-4">
                  <div className="mx-auto bg-gradient-primary p-4 rounded-2xl w-fit">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">
            Ready to Transform Your Events?
          </h2>
          <p className="text-xl text-white/90">
            Join hundreds of colleges already using EduEvents to manage their
            events efficiently
          </p>
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/login")}
            className="text-lg px-8 py-4 bg-white text-primary hover:bg-white/90 shadow-glow"
          >
            Start Your Journey
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
