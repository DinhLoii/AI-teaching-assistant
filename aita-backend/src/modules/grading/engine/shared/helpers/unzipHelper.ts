// @ts-nocheck
import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs';

export async function extractZipAsync(zipPath: string, extractToDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(extractToDir)) {
                fs.mkdirSync(extractToDir, { recursive: true });
            }
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractToDir, true);
            resolve(extractToDir);
        } catch (error) {
            reject(error);
        }
    });
}

