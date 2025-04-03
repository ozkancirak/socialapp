import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary with credentials from environment variables
function configureCloudinary() {
  cloudinary.config({ 
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dp5vwksjt', 
    api_key: process.env.CLOUDINARY_API_KEY || '324225945759815', 
    api_secret: process.env.CLOUDINARY_API_SECRET || 'YUl_8ezdQ32QHgFpA48uj8N590Y'
  });
  return cloudinary;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request to get the upload details
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isVideo = formData.get('isVideo') === 'true';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer for cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Configure and upload to cloudinary
    const cloudinary = configureCloudinary();
    
    // Create a temporary file path (for the API only)
    const options = {
      resource_type: isVideo ? 'video' : 'image',
      transformation: [
        {quality: "auto"},
        {fetch_format: "auto"}
      ]
    };
    
    // Upload the buffer directly
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      
      // Write the buffer to the upload stream
      uploadStream.write(buffer);
      uploadStream.end();
    });
    
    // Return the successful response with the URL
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in Cloudinary upload:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
} 