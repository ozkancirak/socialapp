"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import supabase from "@/lib/supabase-client";

// Initialize Supabase client
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState("posts");
  const { user } = useUser();

  // Query posts based on search term
  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ["search-posts", query],
    queryFn: async () => {
      if (!query) return [];
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, 
          content, 
          image_url, 
          created_at,
          user_id,
          users:user_id (username, full_name, avatar_url)
        `)
        .textSearch("content", query)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!query,
  });

  // Query users based on search term
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["search-users", query],
    queryFn: async () => {
      if (!query) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!query,
  });

  if (!query) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Search</h1>
        <p className="text-muted-foreground">Enter a search term to find posts and users.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Search Results for "{query}"</h1>
      
      <Tabs defaultValue="posts" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts">
          {postsLoading ? (
            <p>Loading posts...</p>
          ) : postsError ? (
            <p className="text-red-500">Error loading posts</p>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.users?.avatar_url} alt={post.users?.username} />
                        <AvatarFallback>{post.users?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <Link href={`/profile/${post.users?.username}`} className="font-semibold hover:underline">
                              {post.users?.full_name || post.users?.username}
                            </Link>
                            <p className="text-sm text-muted-foreground">@{post.users?.username}</p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2">{post.content}</p>
                        {post.image_url && (
                          <div className="mt-3 rounded-md overflow-hidden">
                            <img 
                              src={post.image_url} 
                              alt="Post image" 
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p>No posts found matching "{query}"</p>
          )}
        </TabsContent>
        
        <TabsContent value="users">
          {usersLoading ? (
            <p>Loading users...</p>
          ) : usersError ? (
            <p className="text-red-500">Error loading users</p>
          ) : users && users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url} alt={user.username} />
                          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/profile/${user.username}`} className="font-semibold hover:underline">
                            {user.full_name || user.username}
                          </Link>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      {user.id !== user?.id && (
                        <Button variant="outline" size="sm">
                          Follow
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p>No users found matching "{query}"</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main component with Suspense boundary
export default function SearchPage() {
  return (
    <PageLayout>
      <Suspense fallback={<div className="p-4">Loading search results...</div>}>
        <SearchContent />
      </Suspense>
    </PageLayout>
  );
} 