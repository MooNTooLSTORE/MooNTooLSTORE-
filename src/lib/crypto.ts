
"use server";

import { createDecipheriv } from 'crypto';

// Эта функция должна вызываться только на сервере.
export async function decryptBundle(
    encryptedBundleHex: string,
    keyHex: string,
    ivHex: string,
    authTagHex: string
): Promise<string> {
    try {
        const key = Buffer.from(keyHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedBundle = Buffer.from(encryptedBundleHex, 'hex');

        // Используем встроенный в Node.js модуль crypto
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedBundle, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        if (!decrypted) {
            throw new Error('Decryption failed: result is empty. Check key, IV, or authTag.');
        }
        
        return decrypted;

    } catch (e: any) {
        console.error("Decryption error:", e);
        throw new Error(`Failed to decrypt bundle: ${e.message}`);
    }
}
