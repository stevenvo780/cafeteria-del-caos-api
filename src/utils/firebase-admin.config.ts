import * as dotenv from 'dotenv';
import admin from 'firebase-admin';
import { BotConfig } from './types';

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export async function getFirebaseConfig(): Promise<BotConfig> {
  const db = admin.database();
  const snapshot = await db.ref('config').once('value');
  return snapshot.val() || null;
}

export async function updateFirebaseConfig(updates: BotConfig): Promise<void> {
  const db = admin.database();
  await db.ref('config').update(updates);
}

export default admin;
