import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  try {
    const snapshot = await db.collection('logs').get();
    const data = snapshot.docs.map(doc => doc.data());
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar logs' });
  }
}
