// @ts-nocheck
export interface StorageResult {
    success: boolean;
    uri?: string;
    error?: string;
}

/**
 * Abstraction for Blob/Object Storage (e.g., S3, MinIO)
 */
export interface IObjectStorage {
    /**
     * Uploads a file stream/buffer to the storage provider.
     */
    uploadFileAsync(bucket: string, objectKey: string, content: Buffer): Promise<StorageResult>;

    /**
     * Retrieves a file from the storage provider.
     */
    downloadFileAsync(bucket: string, objectKey: string): Promise<Buffer | null>;

    /**
     * Generates a pre-signed URL for direct download.
     */
    getPresignedUrlAsync(bucket: string, objectKey: string, expirySeconds: number): Promise<string>;
    
    /**
     * Deletes an object.
     */
    deleteFileAsync(bucket: string, objectKey: string): Promise<boolean>;
}

