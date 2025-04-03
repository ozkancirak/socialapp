"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  Menu,
  PlusSquare,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { UserButton } from "@clerk/nextjs";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Explore",
      href: "/explore",
      icon: <Search className="h-5 w-5" />,
    },
    {
      label: "Notifications",
      href: "/notifications",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      label: "Messages",
      href: "/messages",
      icon: <Mail className="h-5 w-5" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <User className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {/* Mobile top nav */}
      <div className="md:hidden flex justify-between items-center p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">SocialApp</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="flex flex-col gap-6 py-6">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-xl font-bold">SocialApp</span>
                </Link>
                <div className="flex flex-col gap-3">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-4 font-normal text-base",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
                <div className="flex flex-col gap-4">
                  <Link href="/post/new">
                    <Button className="w-full">
                      <PlusSquare className="h-5 w-5 mr-2" />
                      New Post
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2">
                    <UserButton afterSignOutUrl="/" />
                    <span className="text-sm font-medium">Your Account</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-10">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
} 