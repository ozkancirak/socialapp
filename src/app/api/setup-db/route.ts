import { NextResponse } from "next/server";
import { setupDatabase } from "@/lib/setup-database";

export async function GET() {
  try {
    const result = await setupDatabase();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Database setup completed successfully" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Database setup failed", 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in setup-db API route:", error);
    return NextResponse.json({ 
      success: false, 
      message: "An unexpected error occurred", 
      error 
    }, { status: 500 });
  }
} 