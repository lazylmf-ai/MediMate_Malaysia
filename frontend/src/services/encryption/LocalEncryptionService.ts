/**
 * Local Encryption Service
 *
 * AES-256-GCM encryption for sensitive health data in offline storage.
 * Uses PBKDF2 for key derivation from user credentials.
 */

import * as Crypto from 'expo-crypto';
import { EncryptionConfig } from '../../types/offline';

export interface EncryptedData {
  encrypted: string; // Base64 encoded
  iv: string; // Initialization vector (Base64)
  salt: string; // Salt for key derivation (Base64)
  tag: string; // Authentication tag (Base64)
}

export class LocalEncryptionService {
  private static instance: LocalEncryptionService;
  private config: EncryptionConfig;
  private cachedKey: CryptoKey | null = null;
  private lastKeyDerivation: number = 0;
  private KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor(config: EncryptionConfig) {
    this.config = config;
  }

  public static getInstance(config?: EncryptionConfig): LocalEncryptionService {
    if (!LocalEncryptionService.instance) {
      LocalEncryptionService.instance = new LocalEncryptionService(
        config || {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
          iterations: 100000,
          saltLength: 32,
        }
      );
    }
    return LocalEncryptionService.instance;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public async encrypt(data: string, password: string): Promise<EncryptedData> {
    if (!this.config.enabled) {
      return {
        encrypted: Buffer.from(data).toString('base64'),
        iv: '',
        salt: '',
        tag: '',
      };
    }

    try {
      // Generate random salt and IV
      const salt = await Crypto.getRandomBytesAsync(this.config.saltLength);
      const iv = await Crypto.getRandomBytesAsync(12); // 96-bit IV for GCM

      // Derive encryption key from password
      const key = await this.deriveKey(password, salt);

      // Convert data to ArrayBuffer
      const dataBuffer = new TextEncoder().encode(data);

      // Encrypt using Web Crypto API (AES-GCM)
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128, // 128-bit authentication tag
        },
        key,
        dataBuffer
      );

      // Extract authentication tag (last 16 bytes)
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const ciphertext = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      return {
        encrypted: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
        tag: this.arrayBufferToBase64(tag),
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    if (!this.config.enabled || !encryptedData.salt) {
      return Buffer.from(encryptedData.encrypted, 'base64').toString('utf-8');
    }

    try {
      // Convert Base64 strings back to ArrayBuffers
      const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);
      const tag = this.base64ToArrayBuffer(encryptedData.tag);

      // Derive decryption key from password
      const key = await this.deriveKey(password, salt);

      // Combine ciphertext and tag
      const ciphertextWithTag = new Uint8Array(encrypted.byteLength + tag.byteLength);
      ciphertextWithTag.set(new Uint8Array(encrypted), 0);
      ciphertextWithTag.set(new Uint8Array(tag), encrypted.byteLength);

      // Decrypt using Web Crypto API (AES-GCM)
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128,
        },
        key,
        ciphertextWithTag
      );

      // Convert ArrayBuffer back to string
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    // Check if we can use cached key (for performance)
    const now = Date.now();
    if (this.cachedKey && now - this.lastKeyDerivation < this.KEY_CACHE_DURATION) {
      return this.cachedKey;
    }

    try {
      // Import password as key material
      const passwordBuffer = new TextEncoder().encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive 256-bit key using PBKDF2
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.config.iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
      );

      // Cache the derived key
      this.cachedKey = key;
      this.lastKeyDerivation = now;

      return key;
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Failed to derive encryption key');
    }
  }

  /**
   * Hash data using SHA-256 (for checksums)
   */
  public async hash(data: string): Promise<string> {
    try {
      const dataBuffer = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      return this.arrayBufferToBase64(hashBuffer);
    } catch (error) {
      console.error('Hashing failed:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Generate secure random password
   */
  public async generateSecurePassword(length: number = 32): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    return this.arrayBufferToBase64(randomBytes);
  }

  /**
   * Validate encryption key strength
   */
  public validateKeyStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else suggestions.push('Password should be at least 12 characters');

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 2;

    // Entropy check
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 10) score += 1;

    const strength = score >= 6 ? 'strong' : score >= 4 ? 'medium' : 'weak';
    const isValid = strength !== 'weak';

    if (strength === 'weak') {
      suggestions.push('Use a mix of uppercase, lowercase, numbers, and special characters');
    }

    return { isValid, strength, suggestions };
  }

  /**
   * Clear cached encryption key (for security)
   */
  public clearKeyCache(): void {
    this.cachedKey = null;
    this.lastKeyDerivation = 0;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get encryption configuration
   */
  public getConfig(): EncryptionConfig {
    return { ...this.config };
  }

  /**
   * Update encryption configuration
   */
  public updateConfig(newConfig: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearKeyCache(); // Clear cache when config changes
  }
}

export default LocalEncryptionService.getInstance();