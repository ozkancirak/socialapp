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
    // Sayfa yüklendiğinde ilk tıklamada tüm videoları unmute et
    const enableAudio = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        // Videoyu unmute et
        video.muted = false;
        
        // Ses seviyesini kontrolü için
        if (!video.hasAttribute('data-volume-set')) {
          video.volume = 0.6; // Varsayılan ses seviyesi
          video.setAttribute('data-volume-set', 'true');
        }
      });
      
      // İlk tıklamadan sonra bu genel event listener'ı kaldır
      document.removeEventListener('click', enableAudio);
      
      // Kullanıcıyı bilgilendir
      const toast = document.createElement('div');
      toast.innerHTML = 'Videolarda ses açıldı';
      toast.className = 'fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-md z-50 animate-fade-in-out';
      toast.style.animation = 'fadeInOut 2s ease-in-out forwards';
      document.body.appendChild(toast);
      
      // Toast'u kaldır
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    };
    
    // Stiller ekle
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    
    document.addEventListener('click', enableAudio);
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.head.removeChild(style);
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