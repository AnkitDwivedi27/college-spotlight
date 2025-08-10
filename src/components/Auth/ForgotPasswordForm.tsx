import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await resetPassword(email);
    
    if (!error) {
      setEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions",
      });
    } else {
      toast({
        title: "Failed to send reset email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto bg-white/10 backdrop-blur-sm p-4 rounded-2xl w-fit">
              <GraduationCap className="h-12 w-12 text-white mx-auto" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white">Check Your Email</h1>
            <p className="mt-2 text-white/80">We've sent reset instructions to {email}</p>
          </div>

          <Card className="bg-white/95 backdrop-blur-sm shadow-elegant border-0">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Click the link in your email to reset your password. The link will expire in 1 hour.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto bg-white/10 backdrop-blur-sm p-4 rounded-2xl w-fit">
            <GraduationCap className="h-12 w-12 text-white mx-auto" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-white/80">Enter your email to receive reset instructions</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-elegant border-0">
          <CardHeader className="space-y-1">
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              We'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => navigate('/login')}
                className="text-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;