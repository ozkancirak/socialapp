"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  Settings,
  PlusSquare,
} from "lucide-react";
import { MobileNav } from "./mobile-nav";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

export function Sidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
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
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <nav className="hidden md:flex flex-col gap-2 w-[270px] p-4">
        <Link href="/" className="flex items-center gap-2 pb-4">
          <span className="text-xl font-bold">SocialApp</span>
        </Link>
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
        <Link href="/post/new">
          <Button className="w-full mt-6">
            <PlusSquare className="h-5 w-5 mr-2" />
            New Post
          </Button>
        </Link>
      </nav>
      <MobileNav />
    </>
  );
} 