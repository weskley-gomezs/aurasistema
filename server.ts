import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');

async function startServer() {
  const app = express();
  
  // Support up to 50MB of payload (important for uploading base64 product images/photos)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route: Get synced data (products, customers, sales)
  app.get('/api/data', async (req, res) => {
    try {
      // Load from local data.json if exists
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = await fs.promises.readFile(DATA_FILE, 'utf-8');
        return res.json(JSON.parse(fileContent));
      }

      // Absolute fallback
      return res.json({ products: [], customers: [], sales: [] });
    } catch (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Failed to read data' });
    }
  });

  // API Route: Sync/save whole state
  app.post('/api/sync', async (req, res) => {
    try {
      const { products, customers, sales, force } = req.body;
      const incomingProducts = products || [];
      const incomingCustomers = customers || [];
      const incomingSales = sales || [];

      const incomingIsEmpty = incomingProducts.length === 0 && 
                              incomingCustomers.length === 0 && 
                              incomingSales.length === 0;

      // Read current state from local data.json to compare
      let currentLocal: any = null;
      if (fs.existsSync(DATA_FILE)) {
        try {
          const fileContent = await fs.promises.readFile(DATA_FILE, 'utf-8');
          currentLocal = JSON.parse(fileContent);
        } catch (e) {
          // ignore parsing error
        }
      }

      const localHasData = currentLocal && 
                           ((currentLocal.products && currentLocal.products.length > 0) ||
                            (currentLocal.customers && currentLocal.customers.length > 0) ||
                            (currentLocal.sales && currentLocal.sales.length > 0));

      // Guard: Do not allow an empty payload from a new device to overwrite non-empty data on the server
      if (incomingIsEmpty && localHasData && !force) {
        console.log('[API] Ignored empty sync request to prevent accidental data loss');
        return res.json({ success: true, message: 'Ignored empty sync to protect existing data' });
      }

      const payload = {
        products: incomingProducts,
        customers: incomingCustomers,
        sales: incomingSales
      };

      // Save locally
      await fs.promises.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');

      return res.json({ success: true });
    } catch (err) {
      console.error('Error writing data file:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // Vite Integration for development / production asset serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
