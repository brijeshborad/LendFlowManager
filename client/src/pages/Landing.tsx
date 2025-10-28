import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideIndianRupee, TrendingUp, Bell, Mail, BarChart3, Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return apiRequest("POST","/api/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid username or password",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    }) => {
        return apiRequest("POST", "/api/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Could not create account",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LP</span>
            </div>
            <h1 className="text-xl font-bold">LendingPro</h1>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold mb-6">
              Professional Lending Management
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Track loans, automate reminders, and manage borrowers with real-time notifications
              and comprehensive reporting - all in one powerful platform.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <LucideIndianRupee className="h-5 w-5 text-white" />
                </div>
                <p className="text-muted-foreground">Complete loan tracking with automatic interest calculations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <p className="text-muted-foreground">Real-time analytics and interactive dashboards</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <p className="text-muted-foreground">Smart notifications for payments and overdue loans</p>
              </div>
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Sign in to your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          data-testid="input-login-username"
                          placeholder="Enter your username"
                          value={loginData.username}
                          onChange={(e) =>
                            setLoginData({ ...loginData, username: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          data-testid="input-login-password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData({ ...loginData, password: e.target.value })
                          }
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        data-testid="button-login"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Log In"}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-username">Username *</Label>
                        <Input
                          id="register-username"
                          data-testid="input-register-username"
                          placeholder="Choose a username"
                          value={registerData.username}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, username: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password *</Label>
                        <Input
                          id="register-password"
                          data-testid="input-register-password"
                          type="password"
                          placeholder="At least 6 characters"
                          value={registerData.password}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, password: e.target.value })
                          }
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          data-testid="input-register-email"
                          type="email"
                          placeholder="your@email.com (optional)"
                          value={registerData.email}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstName">First Name</Label>
                          <Input
                            id="register-firstName"
                            data-testid="input-register-firstName"
                            placeholder="First name"
                            value={registerData.firstName}
                            onChange={(e) =>
                              setRegisterData({ ...registerData, firstName: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-lastName">Last Name</Label>
                          <Input
                            id="register-lastName"
                            data-testid="input-register-lastName"
                            placeholder="Last name"
                            value={registerData.lastName}
                            onChange={(e) =>
                              setRegisterData({ ...registerData, lastName: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        data-testid="button-register"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16">
          <h3 className="text-3xl font-bold mb-8 text-center">Powerful Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                  <LucideIndianRupee className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Complete Loan Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Manage multiple loans per borrower with flexible payment recording and automatic interest calculations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-Time Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Interactive dashboards with live updates showing outstanding amounts, interest trends, and portfolio health.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant alerts for payments, high pending interest, and overdue loans via real-time WebSocket updates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Automated Email Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Customizable email templates with scheduled reminders for payment due dates and interest alerts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Comprehensive Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Generate borrower statements, tax reports, and portfolio analytics with PDF and Excel export options.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Bank-level security with data encryption, audit logs, and complete isolation between user accounts.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 LendingPro. Professional lending management platform.</p>
        </div>
      </footer>
    </div>
  );
}
