"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useUser } from "@clerk/nextjs";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { PostCard } from "@/components/post/post-card";
import { ensureUuidFormat } from "@/lib/clerk-helpers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const postId = params.id as string;
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      try {
        // Fetch post
        const { data: postData, error: postError } = await supabase
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
          .eq("id", postId)
          .single();
          
        if (postError) {
          console.error("Error fetching post:", postError);
          setError("Post not found");
          setIsLoadingPost(false);
          return;
        }
        
        // Transform post data
        const transformedPost = {
          ...postData,
          likes_count: (postData.likes_count && postData.likes_count[0]?.count) || 0,
          comments_count: (postData.comments_count && postData.comments_count[0]?.count) || 0,
        };
        
        // Check if current user has liked the post
        if (user) {
          const formattedUserId = await ensureUuidFormat(user.id);
          
          const { data: likeData } = await supabase
            .from("likes")
            .select("*")
            .match({ user_id: formattedUserId, post_id: postId })
            .maybeSingle();
            
          transformedPost.is_liked = !!likeData;
        } else {
          transformedPost.is_liked = false;
        }
        
        setPost(transformedPost);
        setIsLoadingPost(false);
        
        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select(`
            id,
            content,
            created_at,
            user_id,
            users:user_id (username, full_name, avatar_url)
          `)
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
          
        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
          setIsLoadingComments(false);
          return;
        }
        
        setComments(commentsData || []);
        setIsLoadingComments(false);
        
      } catch (error) {
        console.error("Error in fetchPostAndComments:", error);
        setError("An error occurred while loading the post");
        setIsLoadingPost(false);
        setIsLoadingComments(false);
      }
    };
    
    fetchPostAndComments();
  }, [postId, user]);
  
  // Handle submitting a new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !isSignedIn) {
      toast.error("You must be signed in to comment");
      return;
    }
    
    if (!commentContent.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Get formatted user ID
      const formattedUserId = await ensureUuidFormat(user.id);
      
      // Create comment using SQL (most reliable method)
      try {
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql: `
            INSERT INTO comments (id, post_id, user_id, content, created_at, updated_at)
            VALUES (gen_random_uuid(), '${postId}', '${formattedUserId}', '${commentContent.replace(/'/g, "''")}', NOW(), NOW())
            RETURNING id
          `
        });
        
        if (sqlError) {
          console.error("SQL comment error:", sqlError);
          throw sqlError;
        }
        
        console.log("Comment added via raw SQL");
      } catch (sqlError) {
        console.error("SQL comment failed:", sqlError);
        
        // Try standard insert as fallback
        const { error: insertError } = await supabase
          .from("comments")
          .insert({
            post_id: postId,
            user_id: formattedUserId,
            content: commentContent.trim(),
          });
          
        if (insertError) {
          console.error("Standard comment error:", insertError);
          throw insertError;
        }
        
        console.log("Comment added via standard insert");
      }
      
      toast.success("Comment added successfully");
      
      // Clear comment input
      setCommentContent("");
      
      // Add new comment to the list
      const newComment = {
        id: 'temp-' + Date.now(),
        content: commentContent.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        users: {
          username: user.username || `user_${user.id.substring(0, 8)}`,
          full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          avatar_url: user.imageUrl
        }
      };
      
      setComments(prev => [...prev, newComment]);
      
      // Update comment count on post
      setPost(prev => ({
        ...prev,
        comments_count: prev.comments_count + 1
      }));
      
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle post deletion
  const handlePostDelete = () => {
    // Redirect to home page after post is deleted
    router.push('/');
    toast.success("Post deleted successfully");
  };
  
  // Handle like changes
  const handleLikeChange = (postId: string, isLiked: boolean) => {
    setPost(prev => ({
      ...prev,
      is_liked: isLiked,
      likes_count: isLiked ? prev.likes_count + 1 : prev.likes_count - 1
    }));
  };
  
  if (error) {
    return (
      <PageLayout>
        <div className="p-4">
          <div className="mb-4">
            <Button onClick={() => router.back()} variant="ghost">← Back</Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Link href="/">
                <Button>Go Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }
  
  if (isLoadingPost) {
    return (
      <PageLayout>
        <div className="p-4">
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout>
      <div className="p-4">
        <div className="mb-4">
          <Button onClick={() => router.back()} variant="ghost">← Back</Button>
        </div>
        
        {/* Post */}
        {post && (
          <div className="mb-6">
            <PostCard
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
            />
          </div>
        )}
        
        {/* Comments section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Comments ({post?.comments_count || 0})</h2>
          </CardHeader>
          
          {/* Add comment form */}
          {isSignedIn && (
            <CardContent>
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting || !commentContent.trim()}>
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
          
          {/* Comments list */}
          <CardContent className="space-y-4">
            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="border-b pb-4 last:border-0">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.users?.avatar_url} alt={comment.users?.username} />
                      <AvatarFallback>{comment.users?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${comment.users?.username}`} className="font-medium hover:underline">
                          {comment.users?.full_name || comment.users?.username}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No comments yet. Be the first to comment!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
} 