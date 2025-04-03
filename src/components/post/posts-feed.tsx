"use client";

import { useState, useEffect } from "react";
import { PostCard } from "./post-card";
import { createClient } from "@supabase/supabase-js";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { ensureUuidFormat } from "@/lib/clerk-helpers";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Post = {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
};

interface PostsFeedProps {
  userId?: string; // Optional: Show only posts from a specific user
}

export function PostsFeed({ userId }: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView();
  const { user } = useUser();

  const POSTS_PER_PAGE = 10;

  // Fetch posts
  const fetchPosts = async (pageNumber: number) => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("posts")
        .select(`
          id, 
          content, 
          image_url, 
          created_at, 
          user_id,
          users:user_id (username, full_name, avatar_url),
          likes_count:likes(count),
          comments_count:comments(count)
        `)
        .order("created_at", { ascending: false })
        .range((pageNumber - 1) * POSTS_PER_PAGE, pageNumber * POSTS_PER_PAGE - 1);
      
      // If userId is provided, filter posts by that user
      if (userId) {
        query = query.eq("user_id", userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        if (pageNumber === 1) {
          setPosts([]);
        }
        setHasMore(false);
        return;
      }
      
      // Fetch if the current user liked each post
      let postsWithLikes = [];
      
      if (user) {
        try {
          // Ensure the user ID is in the correct format for Supabase
          const formattedUserId = await ensureUuidFormat(user.id);
          console.log("Using formatted user ID for like checks:", formattedUserId);
          
          // Try raw SQL for checking likes (most reliable)
          try {
            const likesQueryPromises = data.map(async (post) => {
              try {
                const { data: likeCheckData, error: likeCheckError } = await supabase.rpc('exec_sql', {
                  sql: `SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = '${formattedUserId}' AND post_id = '${post.id}') AS is_liked`
                });
                
                if (likeCheckError) throw likeCheckError;
                
                const isLiked = likeCheckData?.[0]?.is_liked || false;
                
                return {
                  ...post,
                  likes_count: (post.likes_count && post.likes_count[0]?.count) || 0,
                  comments_count: (post.comments_count && post.comments_count[0]?.count) || 0,
                  is_liked: isLiked
                };
              } catch (err) {
                console.error("Error checking like via SQL:", err);
                // Fallback to regular query
                try {
                  const { data: likeData, error: likeError } = await supabase
                    .from("likes")
                    .select("*")
                    .match({ user_id: formattedUserId, post_id: post.id })
                    .maybeSingle();
                  
                  if (likeError) throw likeError;
                  
                  return {
                    ...post,
                    likes_count: (post.likes_count && post.likes_count[0]?.count) || 0,
                    comments_count: (post.comments_count && post.comments_count[0]?.count) || 0,
                    is_liked: !!likeData
                  };
                } catch (likeQueryError) {
                  console.error("Error checking like status:", likeQueryError);
                  return {
                    ...post,
                    likes_count: (post.likes_count && post.likes_count[0]?.count) || 0,
                    comments_count: (post.comments_count && post.comments_count[0]?.count) || 0,
                    is_liked: false
                  };
                }
              }
            });
            
            postsWithLikes = await Promise.all(likesQueryPromises);
          } catch (sqlError) {
            console.error("SQL like check method failed:", sqlError);
            throw sqlError; // Fall through to the standard method
          }
        } catch (err) {
          console.error("Error processing user likes:", err);
          postsWithLikes = data.map(post => ({
            ...post,
            likes_count: (post.likes_count && post.likes_count[0]?.count) || 0,
            comments_count: (post.comments_count && post.comments_count[0]?.count) || 0,
            is_liked: false,
          }));
        }
      } else {
        postsWithLikes = data.map(post => ({
          ...post,
          likes_count: (post.likes_count && post.likes_count[0]?.count) || 0,
          comments_count: (post.comments_count && post.comments_count[0]?.count) || 0,
          is_liked: false,
        }));
      }
      
      if (pageNumber === 1) {
        setPosts(postsWithLikes);
      } else {
        setPosts(prev => [...prev, ...postsWithLikes]);
      }
      
      // Check if there are more posts to load
      setHasMore(postsWithLikes.length === POSTS_PER_PAGE);
      
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(`Failed to load posts: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts(1);
  }, [userId]);

  // Load more when scrolling to the bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      setPage(prev => prev + 1);
      fetchPosts(page + 1);
    }
  }, [inView, hasMore, isLoading]);

  // Handle like changes
  const handleLikeChange = (postId: string, isLiked: boolean) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId ? { ...post, is_liked: isLiked } : post
      )
    );
  };
  
  // Handle post deletion
  const handlePostDelete = (postId: string) => {
    // Remove the deleted post from state
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  // Handle comment count changes
  const handleCommentCountChange = (postId: string, newCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId ? { ...post, comments_count: newCount } : post
      )
    );
  };

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {posts.length === 0 && !isLoading ? (
        <div className="text-center p-4 text-muted-foreground">
          No posts found.
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard 
              key={post.id}
              id={post.id}
              content={post.content}
              image_url={post.image_url}
              created_at={post.created_at}
              user_id={post.user_id}
              users={post.users}
              likes_count={post.likes_count}
              comments_count={post.comments_count}
              is_liked={post.is_liked}
              onLikeChange={handleLikeChange}
              onPostDelete={handlePostDelete}
              onCommentCountChange={handleCommentCountChange}
            />
          ))}
          
          {/* Loading indicator */}
          {hasMore && (
            <div
              ref={ref}
              className="flex justify-center p-4"
            >
              {isLoading && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 