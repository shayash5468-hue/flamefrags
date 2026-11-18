import { PSI_24_INVESTIGATIONS } from '../_psi';

export default function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json(PSI_24_INVESTIGATIONS);
}
