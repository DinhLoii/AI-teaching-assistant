import crypto from 'crypto';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  private static readonly cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  private static readonly apiKey = process.env.CLOUDINARY_API_KEY;
  private static readonly apiSecret = process.env.CLOUDINARY_API_SECRET;

  /**
   * Returns true if Cloudinary environment variables are configured.
   */
  static isConfigured(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Uploads a file stream directly to Cloudinary (useful with multer memory storage)
   * @param fileBuffer The file buffer to upload
   * @param options Cloudinary upload options (like folder, resource_type, public_id)
   */
  static uploadStream(fileBuffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // Use upload_chunked_stream to bypass the 10MB limit for raw files
      // Set chunk size to 6MB (Cloudinary requires < 10MB chunks)
      const uploadOptions = { ...options, chunk_size: 6000000 };
      const uploadStream = cloudinary.uploader.upload_chunked_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        }
      );

      // End the stream with the buffer
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Uploads an image from a public URL to Cloudinary using the REST API (no SDK required).
   * @param imageUrl Public URL of the image to upload
   * @returns The secure URL of the uploaded image, or null if failed
   */
  static async uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('Cloudinary config missing. Skipping avatar upload.');
      return null;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Generate SHA-1 signature
      // The parameters to sign must be in alphabetical order. 
      // We only have timestamp for a basic URL upload.
      const stringToSign = `timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const formData = new URLSearchParams();
      formData.append('file', imageUrl);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Cloudinary API Error:', result.error?.message || result);
        return null;
      }

      return result.secure_url;
    } catch (error) {
      console.error('Failed to upload image to Cloudinary:', error);
      return null;
    }
  }

  /**
   * Deletes a file from Cloudinary by its public ID.
   */
  static deleteFile(publicId: string, resourceType: string = 'raw'): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }
}
