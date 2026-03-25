import express from 'express';
import { db } from '../config/firebase-admin.js';

const router = express.Router();

// Fallback removed to prevent Firebase Admin errors in environments without serviceAccountKey

// Get all invoices (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const { status, msmeId } = req.query;
    let query = db.collection('invoices');
    
    if (status) query = query.where('status', '==', status);
    if (msmeId) query = query.where('msmeId', '==', msmeId);
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('invoices').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status
router.patch('/:id', async (req, res) => {
  try {
    await db.collection('invoices').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
