import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { insertEmailTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type EmailTemplate = {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlBody: string;
  placeholders: string[];
  isDefault: boolean;
  createdAt: string;
};

const templateFormSchema = insertEmailTemplateSchema.extend({});

export default function EmailTemplates() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const form = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      type: "reminder",
      subject: "",
      htmlBody: "",
      placeholders: [],
      isDefault: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      return apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof templateFormSchema>) => {
    createMutation.mutate(data);
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      reminder: "bg-blue-500/10 text-blue-600",
      receipt: "bg-green-500/10 text-green-600",
      statement: "bg-purple-500/10 text-purple-600",
    };
    return (
      <Badge className={`${colors[type as keyof typeof colors] || ""} hover-elevate`}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="heading-templates">
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage email templates for automated communications
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>
                Create a reusable email template with placeholders for automated communications
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Monthly Payment Reminder"
                          {...field}
                          data-testid="input-template-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-template-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="receipt">Receipt</SelectItem>
                          <SelectItem value="statement">Statement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Payment Reminder - {{borrowerName}}"
                          {...field}
                          data-testid="input-template-subject"
                        />
                      </FormControl>
                      <FormDescription>
                        Use placeholders like {"{{"} borrowerName {"}}"}, {"{{"} amount {"}}"}, {"{{"} dueDate {"}}"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="htmlBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body (HTML)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="<p>Dear {{borrowerName}},</p><p>Your payment of {{amount}} is due on {{dueDate}}.</p>"
                          rows={8}
                          {...field}
                          data-testid="input-template-body"
                        />
                      </FormControl>
                      <FormDescription>
                        Write HTML content with placeholders for dynamic data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-template"
                >
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first email template to automate communications
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid="text-template-name">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.subject}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(template.type)}
                    {template.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Preview (HTML Source)
                    </div>
                    <div className="text-sm border rounded-md p-3 bg-muted/30 max-h-32 overflow-y-auto font-mono text-xs">
                      {template.htmlBody.slice(0, 200) + (template.htmlBody.length > 200 ? "..." : "")}
                    </div>
                  </div>
                  {template.placeholders && template.placeholders.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Placeholders
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.placeholders.map((placeholder, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {placeholder}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
