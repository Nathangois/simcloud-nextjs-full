import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';

const COLL_NAME = 'bindings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const snapshot = await db.collection(COLL_NAME).get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json({ bindings: data });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id, ...body } = req.body;
      await db.collection(COLL_NAME).doc(id).set(body, { merge: true });
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar dados' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}
