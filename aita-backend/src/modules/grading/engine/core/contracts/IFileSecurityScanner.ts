// @ts-nocheck
export interface SecurityScanResult {
    isSafe: boolean;
    threatFound?: string;
}

/**
 * Abstraction for scanning uploaded ZIP files before they are extracted.
 */
export interface IFileSecurityScanner {
    /**
     * Scans a file buffer for malware, zip bombs, and path traversal threats.
     */
    scanArchiveAsync(fileBuffer: Buffer): Promise<SecurityScanResult>;
}

