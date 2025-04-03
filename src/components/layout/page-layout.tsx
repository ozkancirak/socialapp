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
    };
    
    document.addEventListener('click', enableAudio);
    
    return () => {
      document.removeEventListener('click', enableAudio);
    };
  }, []);
  
  // Sayfa görünürlüğünü izleyen efekt
  useEffect(() => {
    // Tarayıcı sekmesi arka plana alındığında veya ön plana geldiğinde çalışacak işleyici
    const handleVisibilityChange = () => {
      const videos = document.querySelectorAll('video');
      
      if (document.hidden) {
        // Sayfa görünmez olduğunda tüm videoları durdur
        videos.forEach(video => {
          if (!video.paused) {
            video.pause();
            // Tekrar görünür olunca otomatik başlamak için işaretleyelim
            video.setAttribute('data-was-playing', 'true');
          }
        });
      } else {
        // Sayfa tekrar görünür olduğunda daha önce oynatılanları başlat
        videos.forEach(video => {
          if (video.hasAttribute('data-was-playing')) {
            // IntersectionObserver'ın işini bozmayalım, sadece görünür olanları başlatalım
            const rect = video.getBoundingClientRect();
            const isVisible = 
              rect.top >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
            
            if (isVisible) {
              video.play().catch(() => {
                console.log("Video otomatik oynatılamadı");
              });
            }
            
            video.removeAttribute('data-was-playing');
          }
        });
      }
    };
    
    // Event listener'ı ekle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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