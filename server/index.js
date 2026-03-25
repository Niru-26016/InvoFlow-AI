import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import agentRoutes from './routes/agents.js';
import invoiceRoutes from './routes/invoices.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`
  ⚡ InvoFlow AI Backend running on port ${PORT}
  
  Routes:
  • POST /api/agents/analyze  — AI Invoice Extraction & Verification
  • GET  /api/invoices         — List invoices
  • GET  /api/invoices/:id     — Get invoice
  • PATCH /api/invoices/:id    — Update invoice
  • GET  /api/health           — Health check
  `);
});
