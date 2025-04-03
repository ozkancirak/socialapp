/**
 * Upload an image file to Cloudinary
 */
export async function uploadToCloudinary(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Using unsigned upload preset - make sure this is created in your Cloudinary account
    // and is configured to allow unsigned uploads
    formData.append('upload_preset', 'ml_default');
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      console.error("Cloudinary cloud name not configured");
      return null;
    }
    
    console.log(`Uploading to Cloudinary cloud: ${cloudName}`);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      // Log more details about the error
      const errorText = await response.text();
      console.error(`Upload failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Cloudinary upload successful:", data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
} 