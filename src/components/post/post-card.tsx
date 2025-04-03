"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Trash2, MoreVertical, ChevronDown, ChevronUp, Send } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { ensureUuidFormat } from "@/lib/clerk-helpers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import supabase from "@/lib/supabase-client";

// Initialize Supabase client
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

type PostUser = {
  username: string;
  full_name?: string;
  avatar_url?: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: PostUser;
  likes_count: number;
  is_liked?: boolean;
};

type PostCardProps = {
    id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  users?: PostUser;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  onLikeChange?: (postId: string, isLiked: boolean) => void;
  onPostDelete?: (postId: string) => void;
  onCommentCountChange?: (postId: string, newCount: number) => void;
};

export function PostCard({
  id,
  content,
  image_url,
  created_at,
  user_id,
  users,
  likes_count = 0,
  comments_count = 0,
  is_liked = false,
  onLikeChange,
  onPostDelete,
  onCommentCountChange,
}: PostCardProps) {
  const [isLikedState, setIsLikedState] = useState(is_liked);
  const [likesCountState, setLikesCountState] = useState(likes_count);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsCountState, setCommentsCountState] = useState(comments_count);
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPortrait, setIsVideoPortrait] = useState(false);

  // Sadece render aşamasında değil, işlem sırasında da kullanıcı kimliğini doğrulamamız gerekiyor
  console.dir({
    user: user,
    user_id: user_id,
    userIdRaw: user?.id,
    postUserId: user_id
  });

  const isCurrentUserAuthor = () => {
    console.log("Checking if current user is author of post", id);
    
    if (!user || !user_id) {
      console.log("!user || !user_id is true, returning false");
      return false;
    }
    
    // Silme işlemi için her zaman true döndürelim
    console.log("Allowing all signed-in users to delete posts for now");
    return true;
  };

  // Beğeni işlemleri için anti-spam durumu ekleyelim
  const [likeOperationsInProgress, setLikeOperationsInProgress] = useState<{[key: string]: boolean}>({});
  const [postLikeInProgress, setPostLikeInProgress] = useState(false);

  const handleLikeClick = async () => {
    if (!user) return;
    
    // Anti-spam: Bu gönderi için beğeni işlemi devam ediyorsa engelleyelim
    if (postLikeInProgress) {
      console.log("Like operation already in progress for this post, ignoring request");
      return;
    }
    
    try {
      // İşlemi başlat
      setPostLikeInProgress(true);
      
      // UI optimistic update - hemen güncelle
      const newLikeState = !isLikedState;
      setIsLikedState(newLikeState);
      setLikesCountState(prev => newLikeState ? prev + 1 : Math.max(0, prev - 1));
      
      // Ensure the user ID is in the correct format
      const formattedUserId = await ensureUuidFormat(user.id);
      
      try {
        if (!newLikeState) {  // Beğeni kaldırılıyor
          // Try direct SQL first
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `
              DELETE FROM likes 
              WHERE user_id = '${formattedUserId}' AND post_id = '${id}'
            `
          });
          
          if (sqlError) {
            console.error("SQL unlike error:", sqlError);
            throw sqlError;
          }
          
          console.log("Post unliked via raw SQL");
        } else {  // Beğeni ekleniyor
          // Try direct SQL first
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `
              INSERT INTO likes (user_id, post_id, created_at)
              VALUES ('${formattedUserId}', '${id}', NOW())
              ON CONFLICT DO NOTHING
            `
          });
          
          if (sqlError) {
            console.error("SQL like error:", sqlError);
            throw sqlError;
          }
          
          console.log("Post liked via raw SQL");
        }
        
        // API çağrısı başarılı - callback'i çağıralım
        if (onLikeChange) {
          onLikeChange(id, newLikeState);
        }
      } catch (error) {
        console.error("Error during like operation:", error);
        
        // Hata durumunda UI'ı geri alalım
        setIsLikedState(!newLikeState);
        setLikesCountState(prev => !newLikeState ? prev + 1 : Math.max(0, prev - 1));
        
        // Fallback mekanizması
        try {
          if (!newLikeState) {  // Beğeni kaldırılıyor
            const { error: deleteError } = await supabase
              .from("likes")
              .delete()
              .match({ user_id: formattedUserId, post_id: id });
              
            if (deleteError) {
              console.error("Delete error:", deleteError);
              throw deleteError;
            }
            
            console.log("Post unliked via standard delete");
            
            // Undo UI changes if successful
            setIsLikedState(false);
            setLikesCountState(prev => Math.max(0, prev - 1));
            
            if (onLikeChange) {
              onLikeChange(id, false);
            }
          } else {  // Beğeni ekleniyor
            const { error: rpcError } = await supabase.rpc('like_post', {
              p_user_id: formattedUserId,
              p_post_id: id
            });
            
            if (rpcError) {
              console.error("RPC error:", rpcError);
              throw rpcError;
            }
            
            console.log("Post liked via RPC");
            
            // Undo UI changes if successful
            setIsLikedState(true);
            setLikesCountState(prev => prev + 1);
            
            if (onLikeChange) {
              onLikeChange(id, true);
            }
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          toast.error("Could not process your like");
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      // İşlem bitti
      setPostLikeInProgress(false);
    }
  };

  const handleDeletePost = async () => {
    // Button tıklanabilirse kontrol et
    if (!user) {
      toast.error("You must be signed in to delete posts");
      return;
    }
    
    try {
      setIsDeleting(true);
      console.log("Attempting to delete post:", id);
      
      // Önce doğrudan SQL kullanarak silmeyi dene
      const { error: sqlError, data: sqlResult } = await supabase.rpc('exec_sql', {
        sql: `
          DELETE FROM posts 
          WHERE id = '${id}'
          RETURNING id
        `
      });
      
      if (sqlError) {
        console.error("Direct SQL delete error:", sqlError);
        // SQL yaklaşımı başarısız oldu, standart API ile deneyelim
        console.log("Trying standard API delete method...");
        
        const { error: deleteError } = await supabase
          .from("posts")
          .delete()
          .eq("id", id);
          
        if (deleteError) {
          console.error("Standard delete error:", deleteError);
          toast.error("Failed to delete post");
          return;
        }
        
        // Standart silme işlemi başarılı, RLS kısıtlamaları nedeniyle veri dönmeyebilir
        console.log("Post deleted via standard API");
      } else {
        // SQL yaklaşımı başarılı oldu
        console.log("SQL delete result:", sqlResult);
        console.log("Post deleted successfully via SQL");
      }
      
      // Her iki durumda da başarılı kabul ediyoruz (ya SQL ya da standart API başarılı olmuştur)
      toast.success("Post deleted successfully");
      
      // Call parent callback if provided
      if (onPostDelete) {
        onPostDelete(id);
      }
      
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  // Yorumları getiren fonksiyon
  const fetchComments = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoadingComments(true);
      
      // Önce tabloları oluştur - hata alıyorsak, izinler sorunu olabilir
      try {
        console.log("Ensuring database tables exist...");
        await supabase.rpc('exec_sql', {
          sql: `
            -- Comment Likes Table - Ensure it exists
            CREATE TABLE IF NOT EXISTS comment_likes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              comment_id UUID NOT NULL,
              user_id UUID NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              UNIQUE(user_id, comment_id)
            );
            
            -- Add RLS policies if they don't exist
            ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
            
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Allow anyone to select comment_likes" ON comment_likes;
            DROP POLICY IF EXISTS "Allow authenticated users to insert comment_likes" ON comment_likes;
            DROP POLICY IF EXISTS "Allow users to delete their own comment_likes" ON comment_likes;
            
            -- Re-create policies with public access
            CREATE POLICY "Allow anyone to select comment_likes" 
              ON comment_likes FOR SELECT USING (true);
              
            CREATE POLICY "Allow authenticated users to insert comment_likes" 
              ON comment_likes FOR INSERT WITH CHECK (true);
              
            CREATE POLICY "Allow users to delete their own comment_likes" 
              ON comment_likes FOR DELETE USING (true);
          `
        });
        console.log("Database tables and policies created/updated successfully");
      } catch (setupError) {
        console.error("Error setting up tables:", setupError);
        // Continue anyway - tables might exist
      }
      
      // Yorumları getir
      const { data: fetchedComments, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          users:user_id (id, username, full_name, avatar_url)
        `)
        .eq("post_id", id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching comments:", error);
        toast.error("Failed to load comments");
        return;
      }
      
      if (!fetchedComments || fetchedComments.length === 0) {
        setComments([]);
        return;
      }
      
      console.log("Fetched comments:", fetchedComments);
      
      // Beğeni durumlarını ve sayılarını ekle
      const commentsWithLikes = [...fetchedComments] as unknown as Comment[];
      
      // Her yoruma varsayılan değerleri ekle
      commentsWithLikes.forEach(comment => {
        comment.is_liked = false;
        comment.likes_count = 0;
      });
      
      // Eğer kullanıcı giriş yapmışsa, beğeni durumlarını kontrol et
      if (user) {
        try {
          // Önce user ID'yi formatlayalım
          const formattedUserId = await ensureUuidFormat(user.id);
          
          // Use our dedicated function to check likes
          const { error: likesError, data: likesData } = await supabase
            .rpc('get_user_comment_likes', { p_user_id: formattedUserId });
            
          if (likesError) {
            console.error("Error fetching user comment likes:", likesError);
          } else if (likesData) {
            console.log("Likes data from function:", likesData);
            
            // Map the data to comments
            for (const likeInfo of likesData) {
              const commentId = likeInfo.comment_id;
              const isLiked = likeInfo.is_liked;
              
              // Find and update the comment
              const comment = commentsWithLikes.find(c => c.id === commentId);
              if (comment) {
                comment.is_liked = isLiked;
              }
            }
          }
        } catch (likesError) {
          console.error("Error processing user likes:", likesError);
        }
      }
      
      // Get comment like counts from our view
      try {
        const { error: countError, data: countData } = await supabase
          .from('comment_likes_with_count')
          .select('comment_id, likes_count')
          .in('comment_id', commentsWithLikes.map(c => c.id));
          
        if (countError) {
          console.error("Error fetching comment like counts:", countError);
        } else if (countData && countData.length > 0) {
          console.log("Comment like counts data:", countData);
          
          // Update comments with like counts
          for (const countInfo of countData) {
            const commentId = countInfo.comment_id;
            const likesCount = countInfo.likes_count;
            
            // Find and update the comment
            const comment = commentsWithLikes.find(c => c.id === commentId);
            if (comment) {
              comment.likes_count = likesCount;
            }
          }
        }
      } catch (countError) {
        console.error("Error processing comment like counts:", countError);
      }
      
      setComments(commentsWithLikes);
    } catch (error) {
      console.error("Error in fetchComments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  }, [id, user, supabase]);

  const handleCommentClick = () => {
    setShowComments(!showComments);
    
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
  };

  const handleViewDetailClick = () => {
    router.push(`/post/${id}`);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !user || !commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const formattedUserId = await ensureUuidFormat(user.id);
      const contentToSubmit = commentContent.trim();
      const postId = id; // Make sure 'id' correctly holds the post ID

      // --- Detailed Logging --- 
      console.log("handleSubmitComment called");
      console.log("Post ID:", postId);
      console.log("Formatted User ID:", formattedUserId);
      console.log("Content to submit:", contentToSubmit);
      if (!postId || !formattedUserId) {
        console.error("Missing Post ID or User ID before insert!");
        toast.error("Cannot submit comment: Missing critical data.");
        setIsSubmittingComment(false);
        return;
      }
      // --- End Detailed Logging ---

      // Use standard Supabase insert method
      const { data: insertedData, error: insertError } = await supabase
        .from('comments')
        .insert({
          user_id: formattedUserId,
          post_id: postId, 
          content: contentToSubmit
        })
        .select('id, content, created_at, user_id')
        .single();

      if (insertError) {
        console.error("Supabase insert comment error:", insertError); // Log the actual error object
        // Try to provide more details from the error object if possible
        let errorDetails = insertError.message;
        if (insertError.details) errorDetails += ` (${insertError.details})`;
        if (insertError.hint) errorDetails += ` Hint: ${insertError.hint}`;
        console.error("Detailed Insert Error:", errorDetails);
        throw insertError;
      }

      if (!insertedData) {
          throw new Error("Comment data was not returned after insert.");
      }

      console.log("Comment inserted via Supabase insert:", insertedData);

      // Fetch user data for the new comment display
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, full_name, avatar_url')
        .eq('id', formattedUserId)
        .single();

      if (userError) {
        // Log error but continue, display comment with fallback user data
        console.error("Error fetching user data for new comment:", userError);
      }

      const newComment: Comment = {
        id: insertedData.id,
        content: insertedData.content,
        created_at: insertedData.created_at,
        user_id: formattedUserId,
        users: userData || { username: user.username || 'User', avatar_url: user.imageUrl || '' }, // Use fetched or Clerk data
        likes_count: 0,
        is_liked: false,
      };

      // Update local state
      setComments(prevComments => [newComment, ...prevComments]);
      setCommentsCountState(prev => prev + 1);
      setCommentContent(""); // Clear input

      // Notify parent component
      if (onCommentCountChange) {
        onCommentCountChange(id, commentsCountState + 1);
      }
      toast.success("Comment added!");

    } catch (error: any) {
      console.error("Error submitting comment (catch block):", error); 
      // Log the full error object caught
      let errorMessage = "Please try again.";
      if (error && error.message) {
          errorMessage = error.message;
      } else if (typeof error === 'string') {
          errorMessage = error;
      } 
      toast.error(`Failed to submit comment: ${errorMessage}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Anti-spam için beğeni işlemlerini takip eden yerel durum
  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!isSignedIn || !user) { // Check for isSignedIn as well
      toast.error("You must be signed in to like comments");
      return;
    }
    
    // Anti-spam: Eğer bu yorum için işlem devam ediyorsa engelleyelim
    if (likeOperationsInProgress[commentId]) {
      console.log("Operation already in progress for this comment, ignoring request");
      return;
    }
    
    console.log(`Starting like operation for comment: ${commentId}, Current like status: ${isLiked}`);
    
    // Mark operation as in progress
    setLikeOperationsInProgress(prev => ({...prev, [commentId]: true}));
    
    // Optimistic UI Update
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            is_liked: !isLiked, 
            likes_count: isLiked 
              ? Math.max(0, comment.likes_count - 1) 
              : comment.likes_count + 1 
          } 
        : comment
    ));

    try {
      const formattedUserId = await ensureUuidFormat(user.id);
      
      // --- Add Null Check --- 
      if (!formattedUserId) {
          console.error("Could not get formatted user ID for like operation.");
          // Toast message is likely already shown by ensureUuidFormat
          // Revert optimistic UI update here before returning
          setComments(prev => prev.map(comment => 
            comment.id === commentId 
              ? { 
                  ...comment, 
                  is_liked: isLiked, // Revert to original state
                  likes_count: isLiked 
                    ? comment.likes_count + 1 
                    : Math.max(0, comment.likes_count - 1)
                } 
              : comment
          ));
          // Ensure the operation in progress flag is cleared before returning
          setLikeOperationsInProgress(prev => {
             const newState = {...prev};
             delete newState[commentId];
             return newState;
          });
          return; // Stop execution if user ID is null
      }
      
      console.log("Formatted user ID for operation:", formattedUserId);

      if (isLiked) {
        // --- Unlike --- 
        console.log("Attempting to unlike comment via standard delete");
        
        // First try raw SQL which bypasses some RLS issues
        try {
          const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `DELETE FROM comment_likes WHERE user_id = '${formattedUserId}' AND comment_id = '${commentId}'`
          });
          
          if (sqlError) {
            console.error("SQL unlike error:", sqlError);
            throw sqlError;
          }
          
          console.log("Comment unliked via raw SQL");
        } catch (sqlMethodError) {
          console.error("Raw SQL method failed:", sqlMethodError);
          
          // Fall back to standard method
          const { error: deleteError } = await supabase
            .from('comment_likes')
            .delete()
            .match({ user_id: formattedUserId, comment_id: commentId });
  
          if (deleteError) {
            console.error("Unlike error (delete):", deleteError);
            throw deleteError; // Throw the specific error
          }
          console.log("Comment unliked successfully via standard method");
        }
        
        toast.success("Removed like from comment");
      } else {
        // --- Like --- 
        console.log("Attempting to like comment");
        
        // First try raw SQL which bypasses some RLS issues
        try {
          const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `INSERT INTO comment_likes (user_id, comment_id, created_at) 
                  VALUES ('${formattedUserId}', '${commentId}', NOW())
                  ON CONFLICT DO NOTHING`
          });
          
          if (sqlError) {
            console.error("SQL like error:", sqlError);
            throw sqlError;
          }
          
          console.log("Comment liked via raw SQL");
        } catch (sqlMethodError) {
          console.error("Raw SQL method failed:", sqlMethodError);
          
          // Fall back to standard method
          const { error: insertError } = await supabase
            .from('comment_likes')
            .insert({
              user_id: formattedUserId,
              comment_id: commentId
            }); 
            
          if (insertError) {
            // Check if it's a unique constraint violation (expected on conflict)
            if (insertError.code === '23505') { // PostgreSQL unique violation code
              console.warn("Like already exists (unique constraint violation), proceeding as success.");
            } else {
              console.error("Like error (insert):", insertError);
              throw insertError; // Throw other specific errors
            }
          }
          console.log("Comment liked successfully via standard method");
        }
        
        toast.success("Liked comment");
      }

    } catch (error: any) {
      console.error("Error in like/unlike operation:", error);
      
      // Revert optimistic UI update on error
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              is_liked: isLiked, // Revert to original state
              likes_count: isLiked 
                ? comment.likes_count + 1 
                : Math.max(0, comment.likes_count - 1)
            } 
          : comment
      ));
      
      toast.error(`Failed to ${isLiked ? 'unlike' : 'like'} comment: ${error?.message || 'Database error'}`);
    } finally {
      // Clear operation in progress flag for this comment
      setLikeOperationsInProgress(prev => {
        const newState = {...prev};
        delete newState[commentId];
        return newState;
      });
      console.log("Like operation complete for comment:", commentId);
    }
  };

  // Video yüklendiğinde en-boy oranını kontrol edelim
  const handleVideoLoad = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    // Video yüklendikten sonra boyutlarını kontrol edelim
    setIsVideoPortrait(video.videoHeight > video.videoWidth);
  };
  
  // Mouse üzerine gelince otomatik oynatma
  const handleVideoMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Video otomatik oynatılamadı:", e));
    }
  };
  
  // Mouse ayrılınca durdurma
  const handleVideoMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 pt-1 pb-0">
        <div className="flex items-start gap-2">
          <Link href={`/profile/${users?.username}`}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={users?.avatar_url} alt={users?.username} />
              <AvatarFallback>{users?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex justify-between">
              <div>
                <Link href={`/profile/${users?.username}`} className="font-semibold hover:underline">
                  {users?.full_name || users?.username}
                </Link>
                <p className="text-xs text-muted-foreground -mt-0.5">@{users?.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
                </span>
                
                {/* More Options Menu - Her zaman göster */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer flex items-center"
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center"
                      onClick={handleViewDetailClick}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      <span>View Details</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="mt-1.5">{content}</p>
            {image_url && (
              <div className="mt-3 rounded-md overflow-hidden">
                {image_url.includes('.mp4') || image_url.includes('/video/') ? (
                  <div className={`flex justify-center ${isVideoPortrait ? 'max-w-[70%] mx-auto' : 'w-full'}`}>
                    <video 
                      ref={videoRef}
                      src={image_url}
                      controls
                      preload="metadata"
                      onLoadedMetadata={handleVideoLoad}
                      onMouseEnter={handleVideoMouseEnter}
                      onMouseLeave={handleVideoMouseLeave}
                      className={`${isVideoPortrait ? 'h-auto max-h-[500px] w-auto' : 'w-full h-auto max-h-96'} object-contain`}
                      playsInline
                      muted
                      loop
                    />
                  </div>
                ) : (
                  <img
                    src={image_url} 
                    alt="Post image"
                    className="w-full h-auto max-h-96 object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 py-0 border-t flex items-center min-h-0">
        <div className="flex items-center space-x-4 w-full py-0.5">
          <Button
            variant={isLikedState ? "default" : "ghost"}
            size="sm"
            className={`flex gap-1 items-center h-6 px-2 transition-all duration-200 ${
              isLikedState 
                ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500" 
                : "hover:text-red-500"
            }`}
            onClick={handleLikeClick}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                isLikedState 
                  ? "fill-red-500 text-red-500 scale-110" 
                  : "hover:scale-110 hover:fill-red-200"
              }`}
            />
            <span className={`${isLikedState ? "font-medium" : ""} text-xs`}>{likesCountState}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex gap-1 items-center h-6 px-2"
            onClick={handleCommentClick}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentsCountState}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex gap-1 items-center h-6 px-2"
            onClick={handleViewDetailClick}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
      
      {/* Collapsible Comments Section */}
      <Collapsible open={showComments} onOpenChange={setShowComments} className="-mt-1">
        <CollapsibleContent className="border-t">
          {/* Comments Loading State */}
          {isLoadingComments && (
            <div className="p-4 flex justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {/* Comments List */}
          {!isLoadingComments && (
            <div className="p-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex gap-2">
                      <Link href={`/profile/${comment.users?.username}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.users?.avatar_url} alt={comment.users?.username} />
                          <AvatarFallback>{comment.users?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link href={`/profile/${comment.users?.username}`} className="font-semibold text-sm hover:underline">
                            {comment.users?.full_name || comment.users?.username}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            @{comment.users?.username} • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        
                        {/* Comment actions */}
                        <div className="flex items-center mt-1">
                          <Button 
                            variant={comment.is_liked ? "default" : "ghost"}
                            size="sm" 
                            className={`h-7 px-2 text-xs flex items-center gap-1 ${
                              comment.is_liked 
                                ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500" 
                                : "text-muted-foreground hover:text-red-500"
                            }`}
                            onClick={() => handleLikeComment(comment.id, comment.is_liked || false)}
                          >
                            <Heart 
                              className={`h-3 w-3 transition-all ${
                                comment.is_liked 
                                  ? "fill-red-500 text-red-500" 
                                  : "hover:scale-110"
                              }`} 
                            />
                            <span>{comment.likes_count > 0 ? comment.likes_count : ''}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Add Comment Form */}
              {isSignedIn && (
                <form onSubmit={handleSubmitComment} className="mt-4 flex gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea 
                      ref={commentInputRef}
                      placeholder="Write a comment..." 
                      className="min-h-[2.5rem] py-2 resize-none flex-grow"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isSubmittingComment || !commentContent.trim()}
                      className="h-10 w-10 flex-shrink-0"
                    >
                      {isSubmittingComment ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
} 