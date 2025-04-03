"use client";

import { ReactNode, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { SearchBar } from "@/components/search/search-bar";

type PageLayoutProps = {
  children: ReactNode;
};

export function PageLayout({ children }: PageLayoutProps) {
  // Kullanıcı etkileşimini algılayıp videoların sesini açmak için
  useEffect(() => {
    // Sayfa üzerinde herhangi bir tıklama algılandığında
    const enableAudio = () => {
      // Bu etkileşimi kullanarak tüm videolara ses ekle
      document.querySelectorAll('video').forEach(video => {
        video.muted = false;
      });
      // Event listener'ı kaldır, sadece bir kez çalışsın
      document.removeEventListener('click', enableAudio);
    };
    
    // Event listener ekle
    document.addEventListener('click', enableAudio);
    
    // Component unmount olduğunda temizle
    return () => {
      document.removeEventListener('click', enableAudio);
    };
  }, []);
  
  return (
    <>
      <SignedIn>
        {/* Auth olmuş kullanıcıya özel görünüm */}
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 border-x border-border max-w-4xl mx-auto">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur p-4 border-b border-border">
              <SearchBar />
            </div>
            {children}
          </main>
          <div className="hidden lg:flex w-[300px] p-4 flex-col gap-4">
            <div className="flex justify-between items-center">
              <UserButton afterSignOutUrl="/" />
              <ThemeToggle />
            </div>
            {/* Additional content for the right sidebar */}
            <div className="rounded-lg border border-border p-4 mt-4">
              <h2 className="font-semibold mb-2">Suggested Users</h2>
              {/* Suggested users would go here */}
              <p className="text-sm text-muted-foreground">
                No suggestions available
              </p>
            </div>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        {/* Auth olmamış kullanıcılara doğrudan Clerk UI göster */}
        <div className="flex justify-center items-center min-h-screen p-4">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                footerActionLink: "text-primary hover:text-primary/90",
              },
            }}
          />
        </div>
      </SignedOut>
    </>
  );
}