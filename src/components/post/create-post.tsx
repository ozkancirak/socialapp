"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, X } from "lucide-react";
import { v4 as uuidv4 } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { ensureUuidFormat } from "@/lib/clerk-helpers";
import { uploadToCloudinary } from "@/lib/cloudinary";
import supabase from "@/lib/supabase-client";

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!content.trim() && !imageFile) {
      toast.error("Please add content or an image to your post");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      let imageUrl = null;
      
      // First, ensure user exists in the database
      try {
        // Convert Clerk ID to UUID format for consistency
        const formattedUserId = await ensureUuidFormat(user.id);
        
        // Use simple username without adding unique suffix
        const username = user.username || 'user';
        const avatarUrl = user.imageUrl;
        
        console.log("Using user ID:", formattedUserId);
        
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', formattedUserId)
          .single();
        
        if (!existingUser) {
          console.log("User doesn't exist, creating new user");
          
          // Create user with minimal fields
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: formattedUserId,
              username,
              avatar_url: avatarUrl
            });
          
          if (userError) {
            console.error("Failed to create user:", userError.message);
            throw userError;
          }
          
          console.log("User created successfully");
        } else {
          console.log("User already exists");
        }
      } catch (userError: any) {
        // Continue anyway - we'll use the test UUID
        console.log("Using test UUID for post");
      }
      
      // Try to upload image if provided
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
        if (!imageUrl) {
          toast.error("Image upload failed");
        }
      }
      
      // Create the post
      try {
        // Skip user sync and go straight to post creation
        console.log("Creating post with content:", content.substring(0, 30));
        
        // Convert Clerk ID to UUID format
        const formattedUserId = await ensureUuidFormat(user.id);
        
        const { error } = await supabase
          .from("posts")
          .insert({
            user_id: formattedUserId,
            content: content.trim(),
            image_url: imageUrl,
          });
        
        if (error) {
          console.error("Post creation failed:", error.message);
          toast.error(`Failed to create post: ${error.message}`);
          return;
        }
        
        // Clear form on success
        setContent("");
        setImageFile(null);
        setImagePreview(null);
        
        toast.success("Post created successfully");
        
        // Notify parent component
        if (onPostCreated) {
          onPostCreated();
        }
      } catch (error: any) {
        console.error("Post creation exception:", error);
        toast.error(`Error: ${error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
              <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0"
              />
              {imagePreview && (
                <div className="relative mt-3 rounded-md overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-auto max-h-80 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-4 py-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="post-image"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </div>
          <Button 
            type="submit" 
            size="sm"
            disabled={isSubmitting || (!content.trim() && !imageFile)}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 