import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Bell, Mail, BarChart3, Shield } from "lucide-react";

export default function Landing() {
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
          <Button asChild data-testid="button-login">
            <a href="/api/login">Log In</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Professional Lending Management
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Track loans, automate reminders, and manage borrowers with real-time notifications
            and comprehensive reporting - all in one powerful platform.
          </p>
          <Button size="lg" className="text-lg px-8" asChild data-testid="button-get-started">
            <a href="/api/login">Get Started</a>
          </Button>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-white" />
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

        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to streamline your lending business?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            Start managing loans professionally with automated tracking and reminders.
          </p>
          <Button size="lg" className="text-lg px-8" asChild data-testid="button-cta">
            <a href="/api/login">Start Free</a>
          </Button>
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
