"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function SyncPage() {
  const { user } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiReady, setApiReady] = useState(false);

  // First check if API is available
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // Make a HEAD request to the API endpoint
        const response = await fetch("/api", { method: "HEAD" });
        setApiReady(true);
      } catch (error) {
        console.error("API check failed:", error);
        setApiReady(false);
      }
    };
    
    checkApiStatus();
  }, []);

  const handleSync = async () => {
    if (!user) {
      toast.error("You must be signed in to sync your account");
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncResult(null);
    
    try {
      // Add a timestamp to bypass cache
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/sync-user?t=${timestamp}`);
      const data = await response.json();
      
      setSyncResult(data);
      
      if (data.success) {
        setSyncStatus('success');
        toast.success("User successfully synced to Supabase!");
      } else {
        setSyncStatus('error');
        toast.error(`Sync failed: ${data.message}`);
      }
    } catch (error) {
      console.error("Error during sync:", error);
      setSyncStatus('error');
      setSyncResult({ error: "Network or server error occurred" });
      toast.error("Failed to sync user. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const autoSync = async () => {
    handleSync();
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  };

  // Handle specific error types with helpful messages
  const getErrorHelp = () => {
    if (!syncResult?.error) return null;
    
    const error = syncResult.error;
    let helpText = "";
    
    if (error.name === "TypeError" && error.message.includes("is not a function")) {
      helpText = "This appears to be a server configuration issue with Clerk authentication. Try refreshing the page or visit the homepage, then come back.";
    } else if (error.message?.includes("NEXT_PUBLIC_SUPABASE_URL")) {
      helpText = "There's an issue with the Supabase configuration. Please make sure environment variables are properly set.";
    }
    
    return helpText ? (
      <div className="mt-2 text-sm text-red-700">
        <p><strong>Troubleshooting:</strong> {helpText}</p>
      </div>
    ) : null;
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
              {!apiReady && (
                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>API Status Check</AlertTitle>
                  <AlertDescription>
                    We're having trouble connecting to the API. This might affect synchronization.
                  </AlertDescription>
                </Alert>
              )}

              {syncStatus === 'success' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Success!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your account has been successfully synchronized. You can now use all features of the application.
                  </AlertDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.location.href = '/'}
                  >
                    Go to Home
                  </Button>
                </Alert>
              )}

              {syncStatus === 'error' && (
                <Alert className="bg-red-50 border-red-200 text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Synchronization Failed</AlertTitle>
                  <AlertDescription>
                    There was a problem syncing your account. Please try again or contact support.
                    {getErrorHelp()}
                  </AlertDescription>
                </Alert>
              )}

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

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSync} 
                    disabled={isSyncing || !user}
                    variant="outline"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      "Sync Account"
                    )}
                  </Button>
                  
                  <Button 
                    onClick={autoSync}
                    disabled={isSyncing || !user}
                  >
                    Sync & Continue
                  </Button>
                </div>
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