// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // ou admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();