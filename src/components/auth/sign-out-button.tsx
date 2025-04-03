"use client";

import { useRouter } from "next/navigation";
import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  return (
    <ClerkSignOutButton signOutCallback={() => router.push("/sign-in")}>
      <Button variant="destructive" className="gap-2">
        <LogOut className="h-4 w-4" />
        Çıkış Yap
      </Button>
    </ClerkSignOutButton>
  );
} 