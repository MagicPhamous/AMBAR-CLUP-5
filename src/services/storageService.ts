/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a product image file to Firebase Cloud Storage.
 * Returns the public download URL of the uploaded image.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const path = `products/${productId || 'new'}_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  
  const metadata = {
    contentType: file.type,
  };
  
  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
