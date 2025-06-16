import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';

const COLL_NAME = 'settings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const snapshot = await db.collection(COLL_NAME).get();
      const settings = {
        excludedDwgPorts: [],
        excludedSimbankPorts: [],
        simbankGroups: {}
      };
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === 'excludedDwgPorts') settings.excludedDwgPorts = data.value || [];
        if (doc.id === 'excludedSimbankPorts') settings.excludedSimbankPorts = data.value || [];
        if (doc.id === 'simbankGroups') settings.simbankGroups = data.value || {};
      });
      res.status(200).json(settings);
    } else if (req.method === 'POST') {
      const { id, ...body } = req.body;
      await db.collection(COLL_NAME).doc(id).set(body, { merge: true });
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar configuração' });
  }
}
