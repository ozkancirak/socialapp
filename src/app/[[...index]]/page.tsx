"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreatePost } from "@/components/post/create-post";
import { PostsFeed } from "@/components/post/posts-feed";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [refreshFeed, setRefreshFeed] = useState(0);
  const { isSignedIn } = useUser();

  const handlePostCreated = () => {
    // Trigger a refresh of the feed
    setRefreshFeed(prev => prev + 1);
  };

  return (
    <PageLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">Home</h1>
        
        {!isSignedIn && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Welcome to SocialApp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This is a modern social media application built with Next.js,
                TypeScript, Tailwind CSS, Supabase, and Clerk.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/explore">
                  <Button>Explore</Button>
                </Link>
                <Link href="/sign-up">
                  <Button variant="outline">Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isSignedIn && (
          <>
            {/* Create Post Component */}
            <CreatePost onPostCreated={handlePostCreated} />
            
            {/* Posts Feed Tabs */}
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Posts</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                {/* Posts Feed Component with key to refresh when new post is created */}
                <PostsFeed key={`all-${refreshFeed}`} />
              </TabsContent>
              
              <TabsContent value="following">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      Follow users to see their posts in your feed.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PageLayout>
  );
} 