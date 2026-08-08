// OmniFlow EMS — Universal Media Storage Engine
// Auto-folder structuring, WebP compression, 2GB quota checks, malware blocking & external media support

import { storage, db } from '../../firebase.js';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import StorageQuotaEngine from './StorageQuotaEngine.js';
import IndexedDBStorage from './IndexedDBStorage.js';

const DISALLOWED_EXTENSIONS = ['.exe', '.bat', '.sh', '.php', '.js', '.vbs', '.cmd', '.msi', '.jar'];

export class MediaStorageEngine {
  /**
   * Safely extracts string tenantId from string or object
   */
  static getTenantString(tenantId) {
    if (!tenantId) return 'acme_corp';
    if (typeof tenantId === 'string') return tenantId;
    if (typeof tenantId === 'object') return tenantId.id || tenantId.tenantId || tenantId.companyId || 'acme_corp';
    return String(tenantId);
  }

  /**
   * Generates a clean, structured storage path per tenant and entity
   * e.g., tenants/acme_corp/employees/emp_101/kyc/aadhaar.pdf
   */
  static getStoragePath(tenantId, category, entityId, subCategory, fileName) {
    const cleanTenant = this.getTenantString(tenantId).toLowerCase();
    const cleanCat = String(category || 'general').toLowerCase();
    const cleanEntity = String(entityId || 'general_entity').toLowerCase();
    const cleanSubCat = subCategory ? `${String(subCategory)}/` : '';
    const safeFileName = String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

    return `tenants/${cleanTenant}/${cleanCat}/${cleanEntity}/${cleanSubCat}${Date.now()}_${safeFileName}`;
  }

  /**
   * Validates file security (blocks executables)
   */
  static validateFileSecurity(fileName) {
    const lower = fileName.toLowerCase();
    const isForbidden = DISALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
    if (isForbidden) {
      throw new Error(`Security Violation: Executable file types (${fileName}) are strictly prohibited.`);
    }
    return true;
  }

  /**
   * Auto-compresses images (JPEG/PNG) to WebP format using HTML Canvas
   */
  static async compressImageToWebP(file, quality = 0.8) {
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return file; // Return as-is for non-compressible media
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(file), 2000); // 2s safety timeout

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_DIM = 2000;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              clearTimeout(timer);
              if (blob) {
                const newName = file.name.substring(0, file.name.lastIndexOf('.')) + '.webp';
                const compressedFile = new File([blob], newName, { type: 'image/webp' });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => { clearTimeout(timer); resolve(file); };
      };
      reader.onerror = () => { clearTimeout(timer); resolve(file); };
    });
  }

  /**
   * Universal File Upload — FREE Plan (Firestore + IndexedDB, no Firebase Storage needed)
   * - Files ≤ 1MB  → Base64 data URL saved in Firestore (permanent cloud storage, FREE)
   * - Files > 1MB  → IndexedDB binary blob (browser-local, instant)
   * - No WebP compression — keeps original format so images display correctly
   */
  static async uploadMedia({ tenantId, category, entityId, subCategory, file, metadata = {}, onProgress }) {
    if (!file) throw new Error('No file provided for upload');
    const cleanTenant = this.getTenantString(tenantId);

    // 1. Security Check
    this.validateFileSecurity(file.name);

    // 2. Quota Check
    const quotaValid = await StorageQuotaEngine.checkQuotaAvailable(cleanTenant, file.size);
    if (!quotaValid.allowed) {
      const err = new Error(`Storage Quota Exceeded: ${quotaValid.usedFormatted} of ${quotaValid.limitFormatted} used.`);
      err.code = 'QUOTA_EXCEEDED';
      err.quotaDetails = quotaValid;
      throw err;
    }

    if (onProgress) onProgress(20);

    // 3. Store file — Base64 for files ≤ 1MB (saved in Firestore), IndexedDB for larger files
    const MAX_BASE64_SIZE = 1 * 1024 * 1024; // 1 MB
    let finalDownloadUrl = '';
    let isIndexedDB = false;

    if (file.size <= MAX_BASE64_SIZE) {
      // Read as Data URL (base64) — stored directly in Firestore document
      finalDownloadUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file); // Keeps original MIME type (image/jpeg, image/png, etc.)
      });
      if (onProgress) onProgress(80);
    } else {
      // Large file → IndexedDB binary Blob storage (instant, browser-local)
      const blobId = `idb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await IndexedDBStorage.saveBlob(blobId, file);
      finalDownloadUrl = `indexeddb://${blobId}`;
      isIndexedDB = true;
      if (onProgress) onProgress(80);
    }

    // 4. Save record to Firestore media_vault (free Firestore cloud storage)
    const mediaRecord = {
      tenantId: cleanTenant,
      category: category || 'general',
      entityId: entityId || '',
      subCategory: subCategory || '',
      fileName: file.name,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath: isIndexedDB ? finalDownloadUrl : '',
      downloadUrl: finalDownloadUrl,
      isExternal: false,
      createdAt: new Date().toISOString(),
      ...metadata
    };

    const docRef = await addDoc(collection(db, 'media_vault'), mediaRecord);
    await StorageQuotaEngine.recordStorageUsage(cleanTenant, file.size);
    if (onProgress) onProgress(100);

    const resObj = {
      id: docRef.id,
      downloadUrl: finalDownloadUrl,
      storagePath: isIndexedDB ? finalDownloadUrl : '',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      mediaRecord
    };

    // Notify Media Vault to refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('media_vault_updated', { detail: resObj }));
    }

    return resObj;
  }



  /**
   * Add External Media Link (Google Drive, Dropbox, YouTube, External URLs) — ZERO Quota Used
   */
  static async addExternalLink({ tenantId, category, entityId, title, externalUrl, metadata = {} }) {
    if (!externalUrl) throw new Error('External URL is required');
    const cleanTenant = tenantId || 'acme_corp';

    const mediaRecord = {
      tenantId: cleanTenant,
      category: category || 'general',
      entityId: entityId || '',
      fileName: title || 'External File Link',
      fileSize: 0, // Zero storage consumed
      downloadUrl: externalUrl,
      isExternal: true,
      createdAt: new Date().toISOString(),
      ...metadata
    };

    const docRef = await addDoc(collection(db, 'media_vault'), mediaRecord);
    const resObj = { id: docRef.id, ...mediaRecord };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('media_vault_updated', { detail: resObj }));
    }

    return resObj;
  }

  /**
   * Delete Media File & Reclaim Quota Space
   */
  static async deleteMedia(tenantId, storagePath, fileSize = 0) {
    if (!storagePath) return;
    const cleanTenant = tenantId || 'acme_corp';

    try {
      if (storagePath.startsWith('indexeddb://')) {
        const blobId = storagePath.replace('indexeddb://', '');
        await IndexedDBStorage.deleteBlob(blobId);
      } else {
        // 1. Delete from Firebase Storage
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }

      // 2. Reclaim Quota in StorageQuotaEngine
      if (fileSize > 0) {
        await StorageQuotaEngine.recordStorageUsage(cleanTenant, -fileSize);
      }
    } catch (err) {
      console.warn('Media deletion warning:', err);
    }
  }
}

export default MediaStorageEngine;
