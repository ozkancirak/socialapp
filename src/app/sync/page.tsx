"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";

export default function SyncPage() {
  const { user } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    if (!user) {
      toast.error("You must be signed in to sync your account");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync-user");
      const data = await response.json();
      
      setSyncResult(data);
      
      if (data.success) {
        toast.success("User successfully synced to Supabase!");
      } else {
        toast.error(`Sync failed: ${data.message}`);
      }
    } catch (error) {
      console.error("Error during sync:", error);
      toast.error("Failed to sync user. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <PageLayout>
      <div className="container max-w-4xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Account Synchronization</CardTitle>
            <CardDescription>
              Sync your Clerk account with Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-4">
                  If you're experiencing issues with posting or interacting with content,
                  your user account may need to be synchronized with our database.
                </p>
                
                {user && (
                  <div className="bg-muted p-4 rounded-md mb-4">
                    <p><strong>Current User:</strong> {user.username || user.firstName || "User"}</p>
                    <p><strong>Clerk ID:</strong> {user.id}</p>
                  </div>
                )}

                <Button 
                  onClick={handleSync} 
                  disabled={isSyncing || !user}
                >
                  {isSyncing ? "Syncing..." : "Sync Account"}
                </Button>
              </div>

              {syncResult && (
                <div className="mt-6 border rounded-md p-4">
                  <h3 className="font-medium mb-2">Sync Result:</h3>
                  <pre className="bg-muted p-2 rounded-md overflow-auto text-sm">
                    {JSON.stringify(syncResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
} 