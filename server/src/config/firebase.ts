import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function findServiceAccountKey(): string | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  }

  const searchDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../client'),
    path.resolve(process.cwd(), '../server'),
    __dirname,
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const match = files.find((f: string) => f.includes('firebase-adminsdk') && f.endsWith('.json'));
        if (match) {
          return path.join(dir, match);
        }
      } catch {
        // ignore directory read errors
      }
    }
  }

  return null;
}

function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const keyPath = findServiceAccountKey();

  if (keyPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as admin.ServiceAccount;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  console.warn('[Firebase] No Firebase Service Account JSON found. Initializing with default credentials.');
  return admin.initializeApp();
}

const firebaseApp = initFirebase();
export const db = firebaseApp.firestore();
export const auth = firebaseApp.auth();
export default firebaseApp;
