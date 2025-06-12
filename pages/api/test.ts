
import { db } from '../../lib/firebase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  try {
    const ref = await db.collection('testConnection').add({
      message: 'Conexão bem-sucedida com o Firestore!',
      timestamp: Date.now(),
    });
    res.status(200).json({ success: true, docId: ref.id });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
