import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Send, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReminderSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Reminder = {
  id: string;
  title: string;
  message: string;
  borrowerId: string | null;
  reminderType: string;
  scheduledFor: string;
  status: string;
  sentAt: string | null;
  failureReason: string | null;
  isRecurring: boolean;
  createdAt: string;
};

type Borrower = {
  id: string;
  name: string;
  email: string;
};

const reminderFormSchema = insertReminderSchema.extend({
  scheduledFor: z.string(),
});

export default function Reminders() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ["/api/borrowers"],
  });

  const form = useForm<z.infer<typeof reminderFormSchema>>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      title: "",
      message: "",
      reminderType: "payment",
      scheduledFor: new Date().toISOString().slice(0, 16),
      status: "pending",
      isRecurring: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reminderFormSchema>) => {
      const payload = {
        ...data,
        scheduledFor: new Date(data.scheduledFor),
        // Send null instead of empty string for borrowerId
        borrowerId: data.borrowerId || null,
      };
      return apiRequest("/api/reminders", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/reminders/${id}/send`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Success",
        description: "Reminder sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof reminderFormSchema>) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover-elevate">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-600 hover-elevate">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 hover-elevate">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getBorrowerName = (borrowerId: string | null) => {
    if (!borrowerId) return "All Borrowers";
    const borrower = borrowers.find((b) => b.id === borrowerId);
    return borrower?.name || "Unknown";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="heading-reminders">
            Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage payment reminders
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reminder">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Reminder</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Payment Due Reminder"
                          {...field}
                          data-testid="input-reminder-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-reminder-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="interest">Interest</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="borrowerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Borrower (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-reminder-borrower">
                            <SelectValue placeholder="All Borrowers" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All Borrowers</SelectItem>
                          {borrowers.map((borrower) => (
                            <SelectItem key={borrower.id} value={borrower.id}>
                              {borrower.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled For</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-reminder-scheduled"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Your payment is due soon..."
                          rows={4}
                          {...field}
                          data-testid="input-reminder-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-reminder"
                >
                  {createMutation.isPending ? "Creating..." : "Create Reminder"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {remindersLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reminders Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first reminder to schedule notifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reminders.map((reminder) => (
            <Card key={reminder.id} data-testid={`card-reminder-${reminder.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid="text-reminder-title">
                      {reminder.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(reminder.status)}
                      <Badge variant="outline">{reminder.reminderType}</Badge>
                    </div>
                  </div>
                  {reminder.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => sendMutation.mutate(reminder.id)}
                      disabled={sendMutation.isPending}
                      data-testid={`button-send-reminder-${reminder.id}`}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Now
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm" data-testid="text-reminder-message">
                    {reminder.message}
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium">Borrower:</span>{" "}
                      {getBorrowerName(reminder.borrowerId)}
                    </div>
                    <div>
                      <span className="font-medium">Scheduled:</span>{" "}
                      {format(new Date(reminder.scheduledFor), "PPpp")}
                    </div>
                    {reminder.sentAt && (
                      <div>
                        <span className="font-medium">Sent:</span>{" "}
                        {format(new Date(reminder.sentAt), "PPpp")}
                      </div>
                    )}
                    {reminder.failureReason && (
                      <div className="text-red-600">
                        <span className="font-medium">Error:</span> {reminder.failureReason}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
