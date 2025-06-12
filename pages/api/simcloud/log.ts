import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { deviceId, port, cmd } = req.body;

      await db.collection('logs').add({
        deviceId,
        port,
        cmd,
        timestamp: Date.now(),
      });

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao registrar log' });
    }
  } else if (req.method === 'GET') {
    try {
      const snapshot = await db.collection('logs').get();
      const data = snapshot.docs.map(doc => doc.data());
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar logs' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}
