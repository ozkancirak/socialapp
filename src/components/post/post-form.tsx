"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostFormValues, postSchema } from "@/lib/validations/post";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PostFormProps = {
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  onSubmit: (values: PostFormValues) => Promise<void>;
  initialData?: {
    content: string;
    imageUrl?: string | null;
  };
  buttonText?: string;
};

export function PostForm({
  user,
  onSubmit,
  initialData,
  buttonText = "Post",
}: PostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    initialData?.imageUrl || null
  );

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: initialData?.content || "",
      imageUrl: initialData?.imageUrl || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      // In a real app, you would upload this image to a storage service
      // and then set the URL in the form
      form.setValue("imageUrl", "https://example.com/placeholder-image.jpg");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreviewImage(null);
    form.setValue("imageUrl", "");
  };

  const handleSubmit = async (values: PostFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      form.reset();
      setPreviewImage(null);
    } catch (error) {
      console.error("Error submitting post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl || ""} alt={user.username} />
            <AvatarFallback>
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="What's happening?"
                      className="min-h-24 resize-none border-none focus-visible:ring-0 text-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {previewImage && (
          <div className="relative rounded-md overflow-hidden">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-80 object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          className={cn(
            "flex",
            previewImage ? "justify-end" : "justify-between"
          )}
        >
          {!previewImage && (
            <div>
              <label htmlFor="image-upload">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-primary"
                  asChild
                >
                  <div>
                    <ImageIcon className="h-5 w-5" />
                    <span className="sr-only">Upload image</span>
                  </div>
                </Button>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          <Button disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>
        </div>
      </form>
    </Form>
  );
} 