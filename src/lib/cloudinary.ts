/**
 * Upload an image or video file to Cloudinary with optimizations via our API route
 */

// Remove direct import of cloudinary which causes the fs module error in client components
// import { v2 as cloudinary } from 'cloudinary';

// For client-side uploads only
export async function uploadToCloudinary(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Determine if it's a video and add to form data
    const isVideo = file.type.startsWith('video/');
    formData.append('isVideo', isVideo.toString());
    
    console.log(`Uploading ${isVideo ? 'video' : 'image'} to Cloudinary via API route`);
    
    // Use our API route instead of calling Cloudinary directly
    const response = await fetch('/api/cloudinary', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Upload successful:', data);
    
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
}

// The server-side code should be moved to a separate file in app/api or server components
// Example for reference only:
/*
// This should be in a separate server-side file (e.g., app/api/cloudinary/route.ts)
import { v2 as cloudinary } from 'cloudinary';

export function configureCloudinary() {
  cloudinary.config({ 
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dp5vwksjt', 
    api_key: process.env.CLOUDINARY_API_KEY || '324225945759815', 
    api_secret: process.env.CLOUDINARY_API_SECRET || 'YUl_8ezdQ32QHgFpA48uj8N590Y'
  });
  return cloudinary;
}

export async function uploadToCloudinaryServer(filePath: string, isVideo: boolean = false) {
  try {
    const cloud = configureCloudinary();
    
    const options = {
      resource_type: isVideo ? 'video' : 'image',
      transformation: [
        {quality: "auto"},
        {fetch_format: "auto"}
      ]
    };

    const result = await cloud.uploader.upload(filePath, options);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary server upload error:", error);
    return null;
  }
}
*/ 