import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

try {
  const serviceAccountPath = resolve(__dirname, '..', 'serviceAccountKey.json');
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.warn('⚠️  serviceAccountKey.json not found. Using default credentials.');
    console.warn('   Download from Firebase Console > Project Settings > Service Accounts');
    admin.initializeApp();
  }
  
  db = admin.firestore();
} catch (err) {
  console.error('Firebase Admin init error:', err.message);
}

export { admin, db };
