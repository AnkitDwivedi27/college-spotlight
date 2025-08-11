import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/user";
import {
  GraduationCap,
  Mail,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await login(email, password /* optionally role */);

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your account",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/app.jpg')" }}
    >
      {/* Slight dark overlay for readability */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo + Heading */}
        <div className="text-center">
          <div className="mx-auto p-4 w-fit">
            <GraduationCap className="h-12 w-12 text-white mx-auto" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">
            EduEvents Login
          </h1>
          <p className="mt-2 text-white/80">
            Access your college event management dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 shadow-lg rounded-md border border-gray-200">
          <CardHeader className="space-y-1">
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Choose your role and enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Select */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value: UserRole) => setRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>Student</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="organizer">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>Organizer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Extra Links */}
            <div className="mt-4 text-center space-y-2">
              <Button
                variant="link"
                onClick={() => navigate("/forgot-password")}
                className="text-sm"
              >
                Forgot your password?
              </Button>
              <div>
                <Button
                  variant="link"
                  onClick={() => navigate("/signup")}
                  className="text-sm"
                >
                  Don't have an account? Sign up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
