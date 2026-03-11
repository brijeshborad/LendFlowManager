import { Home, Users, Wallet, FileText, Settings, Calculator, MoreHorizontal, Bell, Mail, Banknote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const primaryNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Borrowers", url: "/borrowers", icon: Users },
  { title: "Loans", url: "/loans", icon: Wallet },
  { title: "Reports", url: "/reports", icon: FileText },
];

const moreNavItems = [
  { title: "Interest Calculator", url: "/calculator", icon: Calculator },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Email Templates", url: "/templates", icon: Mail },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: userSettings } = useQuery<any>({
    queryKey: ["/api/user/settings"],
  });

  const cashTrackingEnabled = userSettings?.cashTrackingEnabled ?? false;

  const allMoreItems = cashTrackingEnabled
    ? [{ title: "Cash Book", url: "/cashbook", icon: Banknote }, ...moreNavItems]
    : moreNavItems;

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const isMoreActive = allMoreItems.some((item) => isActive(item.url));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {primaryNavItems.map((item) => (
          <Link key={item.url} href={item.url}>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground transition-colors",
                isActive(item.url) && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{item.title}</span>
            </button>
          </Link>
        ))}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground transition-colors",
                isMoreActive && "text-primary"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader>
              <SheetTitle className="text-left">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              {allMoreItems.map((item) => (
                <Link key={item.url} href={item.url}>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-colors min-h-[72px]",
                      isActive(item.url)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                  </button>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
