"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User } from "lucide-react";

type ProfileHeaderProps = {
  username: string;
  fullName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  isCurrentUser: boolean;
  isFollowing: boolean;
  onFollow: () => void;
};

export function ProfileHeader({
  username,
  fullName,
  bio,
  avatarUrl,
  followersCount,
  followingCount,
  isCurrentUser,
  isFollowing,
  onFollow,
}: ProfileHeaderProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarUrl || ""} alt={username} />
          <AvatarFallback>
            <User className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        {isCurrentUser ? (
          <Button variant="outline">Edit Profile</Button>
        ) : (
          <Button
            variant={isFollowing ? "outline" : "default"}
            onClick={onFollow}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>
      
      <div>
        <h1 className="text-xl font-bold">{fullName}</h1>
        <p className="text-muted-foreground">@{username}</p>
      </div>
      
      {bio && <p>{bio}</p>}
      
      <div className="flex gap-4">
        <Button variant="link" className="p-0 h-auto font-normal">
          <span className="font-semibold">{followingCount}</span>
          <span className="text-muted-foreground ml-1">Following</span>
        </Button>
        <Button variant="link" className="p-0 h-auto font-normal">
          <span className="font-semibold">{followersCount}</span>
          <span className="text-muted-foreground ml-1">Followers</span>
        </Button>
      </div>
      
      <Separator />
    </div>
  );
} 