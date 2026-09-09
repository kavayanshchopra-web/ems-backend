// OmniFlow EMS — Universal Media Storage Engine
// Auto-folder structuring, WhatsApp-Style Smart WebP/Audio compression, Supabase Storage integration & quota checks

import { storage, db } from '../../firebase.js';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import StorageQuotaEngine from './StorageQuotaEngine.js';
import IndexedDBStorage from './IndexedDBStorage.js';
import SmartMediaCompressor from './SmartMediaCompressor.js';
import SupabaseSandboxService, { isSandboxEnvironment } from '../services/supabaseSandboxService.js';

const DISALLOWED_EXTENSIONS = ['.exe', '.bat', '.sh', '.php', '.js', '.vbs', '.cmd', '.msi', '.jar'];

export class MediaStorageEngine {
  /**
   * Safely extracts string tenantId from string or object
   */
  static getTenantString(tenantId) {
    if (!tenantId) return '1';
    if (typeof tenantId === 'string') return tenantId;
    if (typeof tenantId === 'object') return tenantId.id || tenantId.tenantId || tenantId.companyId || '1';
    return String(tenantId);
  }

  /**
   * Generates a clean, structured storage path per tenant and entity
   * e.g., tenants/1/employees/emp_101/kyc/aadhaar.pdf
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
   * Auto-compresses images (JPEG/PNG) to WebP format using SmartMediaCompressor
   */
  static async compressImageToWebP(file, quality = 0.85) {
    const result = await SmartMediaCompressor.compressImage(file, { quality });
    return result.file;
  }

  /**
   * Universal File Upload — Powered by Supabase Storage & Smart Pre-Upload Compression
   * - Photos / Bills / Receipts → WebP Canvas Compression (up to 95% size reduction)
   * - Audio / Call Recordings → Voice-optimized streaming
   * - PDFs & Documents → Text vector structure 100% preserved
   * - Direct upload to Supabase bucket 'omniflow-vault' -> returns permanent CDN URL
   */
  static async uploadMedia({ tenantId, category, entityId, subCategory, file, metadata = {}, onProgress }) {
    if (!file) throw new Error('No file provided for upload');
    const cleanTenant = this.getTenantString(tenantId);

    // 1. Security Check
    this.validateFileSecurity(file.name);

    if (onProgress) onProgress(15);

    // 2. WhatsApp-Style Smart Pre-Upload Compression
    let processedFile = file;
    let compressionMeta = { isCompressed: false, savingsPercent: 0 };
    try {
      const compressionRes = await SmartMediaCompressor.processFile(file);
      if (compressionRes && compressionRes.file) {
        processedFile = compressionRes.file;
        compressionMeta = {
          isCompressed: compressionRes.isCompressed,
          savingsPercent: compressionRes.savingsPercent || 0,
          originalSize: compressionRes.originalSize,
          compressedSize: compressionRes.compressedSize
        };
      }
    } catch (compErr) {
      console.warn('[MediaStorageEngine] Compression notice (proceeding with original):', compErr);
    }

    if (onProgress) onProgress(45);

    // 3. Check if Sandbox Environment -> Direct Supabase Storage
    const inSandbox = isSandboxEnvironment();
    if (inSandbox) {
      try {
        const uploadRes = await SupabaseSandboxService.uploadFileToStorage(processedFile, {
          tenantId: cleanTenant,
          category: category || 'general',
          entityId: entityId || '',
          subCategory: subCategory || '',
          customFields: {
            ...metadata,
            ...compressionMeta
          }
        });

        if (onProgress) onProgress(90);

        await StorageQuotaEngine.recordStorageUsage(cleanTenant, processedFile.size);
        if (onProgress) onProgress(100);

        const resObj = {
          id: uploadRes.id,
          downloadUrl: uploadRes.downloadUrl,
          fileUrl: uploadRes.downloadUrl,
          fileName: uploadRes.fileName,
          originalFileName: uploadRes.originalFileName,
          fileSize: uploadRes.fileSize,
          mimeType: uploadRes.mimeType,
          mediaRecord: uploadRes
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('media_vault_updated', { detail: resObj }));
        }

        return resObj;
      } catch (sbErr) {
        console.error('[MediaStorageEngine] Supabase upload failed, checking fallback:', sbErr);
        // Fallback to Base64 data URL if storage upload failed
      }
    }

    // 4. Legacy / Fallback Mode: Convert processed file to Base64 String
    const base64Str = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file contents'));
      reader.readAsDataURL(processedFile);
    });

    if (onProgress) onProgress(75);

    const CHUNK_SIZE = 450 * 1024;
    const isChunked = base64Str.length > CHUNK_SIZE;

    // Save parent record
    const mediaRecord = {
      tenantId: cleanTenant,
      category: category || 'general',
      entityId: entityId || '',
      subCategory: subCategory || '',
      fileName: processedFile.name,
      originalFileName: file.name,
      fileSize: processedFile.size,
      mimeType: processedFile.type || file.type,
      downloadUrl: isChunked ? '' : base64Str,
      isChunked: isChunked,
      isExternal: false,
      createdAt: new Date().toISOString(),
      ...metadata,
      ...compressionMeta
    };

    let docRefId = `local_${Date.now()}`;
    try {
      const docRef = await addDoc(collection(db, 'media_vault'), mediaRecord);
      docRefId = docRef.id;

      if (isChunked) {
        const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const slice = base64Str.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await setDoc(doc(db, 'media_vault', docRef.id, 'chunks', String(i)), {
            index: i,
            data: slice,
            createdAt: new Date().toISOString()
          });
        }
        await updateDoc(doc(db, 'media_vault', docRef.id), { totalChunks });
      }
    } catch (e) {
      console.warn('[MediaStorageEngine] Firestore record save notice:', e);
    }

    await StorageQuotaEngine.recordStorageUsage(cleanTenant, processedFile.size);
    if (onProgress) onProgress(100);

    const resObj = {
      id: docRefId,
      downloadUrl: isChunked ? `firestore_chunked://${docRefId}` : base64Str,
      fileName: processedFile.name,
      fileSize: processedFile.size,
      mimeType: processedFile.type || file.type,
      mediaRecord
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('media_vault_updated', { detail: resObj }));
    }

    return resObj;
  }

  /**
   * Reconstitutes download URL: Direct CDN URL, Data URL, or legacy chunked media
   */
  static async resolveDownloadUrl(item) {
    if (!item) return '';

    // Direct HTTP(S) URL (Supabase CDN URL or External Link)
    if (typeof item === 'string') {
      if (item.startsWith('http') || item.startsWith('data:')) return item;
    }

    if (item.downloadUrl && (item.downloadUrl.startsWith('http') || item.downloadUrl.startsWith('data:'))) {
      return item.downloadUrl;
    }

    if (item.fileUrl && (item.fileUrl.startsWith('http') || item.fileUrl.startsWith('data:'))) {
      return item.fileUrl;
    }

    // Reconstitute Chunked Base64 from Firestore Sub-Collection (Legacy Fallback)
    if (item.isChunked || (item.id && (!item.downloadUrl || item.downloadUrl.startsWith('firestore_chunked://')))) {
      try {
        const chunksSnap = await getDocs(collection(db, 'media_vault', item.id, 'chunks'));
        const chunksList = [];
        chunksSnap.forEach(d => chunksList.push(d.data()));
        chunksList.sort((a, b) => a.index - b.index);

        const fullBase64 = chunksList.map(c => c.data).join('');
        if (!fullBase64) return item.downloadUrl || '';

        const parts = fullBase64.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (item.mimeType || 'application/octet-stream');
        const bstr = window.atob(parts[1].replace(/\s/g, ''));
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to resolve legacy chunked media:', err);
      }
    }

    return item.downloadUrl || item.fileUrl || '';
  }

  /**
   * Add External Media Link (Google Drive, Dropbox, YouTube, External URLs) — ZERO Quota Used
   */
  static async addExternalLink({ tenantId, category, entityId, title, externalUrl, metadata = {} }) {
    if (!externalUrl) throw new Error('External URL is required');
    const cleanTenant = this.getTenantString(tenantId);

    const inSandbox = isSandboxEnvironment();
    if (inSandbox) {
      const mediaId = `mv_ext_${Date.now()}`;
      const mediaRecord = {
        id: mediaId,
        tenant_id: cleanTenant,
        file_name: title || 'External File Link',
        original_file_name: title || 'External File Link',
        file_url: externalUrl,
        file_size: 0,
        mime_type: 'external/link',
        category: category || 'general',
        entity_id: entityId || '',
        compressed: false,
        custom_fields: { ...metadata, isExternal: true }
      };

      await fetch(`https://mucgmzldgvtblmsurtgo.supabase.co/rest/v1/media_vault`, {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1',
          'Authorization': `Bearer sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mediaRecord)
      }).catch(() => {});

      return { id: mediaId, ...mediaRecord, downloadUrl: externalUrl };
    }

    const mediaRecord = {
      tenantId: cleanTenant,
      category: category || 'general',
      entityId: entityId || '',
      fileName: title || 'External File Link',
      fileSize: 0,
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
  static async deleteMedia(tenantId, storagePath, fileSize = 0, docId = null) {
    const cleanTenant = this.getTenantString(tenantId);

    try {
      if (isSandboxEnvironment() || (docId && docId.startsWith('mv_'))) {
        await SupabaseSandboxService.deleteMediaVaultItem(docId, cleanTenant, storagePath);
        if (fileSize > 0) {
          await StorageQuotaEngine.recordStorageUsage(cleanTenant, -fileSize);
        }
        return;
      }

      const targetDocId = docId || (storagePath && !storagePath.startsWith('http') ? storagePath : null);
      if (targetDocId) {
        try {
          const chunksSnap = await getDocs(collection(db, 'media_vault', targetDocId, 'chunks'));
          for (const cDoc of chunksSnap.docs) {
            await deleteDoc(doc(db, 'media_vault', targetDocId, 'chunks', cDoc.id));
          }
        } catch (e) {
          console.warn('Chunk delete cleanup:', e);
        }
        await deleteDoc(doc(db, 'media_vault', targetDocId));
      }

      if (fileSize > 0) {
        await StorageQuotaEngine.recordStorageUsage(cleanTenant, -fileSize);
      }
    } catch (err) {
      console.warn('Media deletion warning:', err);
    }
  }

  /**
   * Fetch Media Vault List for a Tenant
   */
  static async fetchMediaList(tenantId = '1', category = null) {
    if (isSandboxEnvironment()) {
      return await SupabaseSandboxService.fetchMediaVault(tenantId, category);
    }
    return [];
  }
}

export default MediaStorageEngine;
