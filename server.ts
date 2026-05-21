import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import path from 'path';
import Groq from 'groq-sdk';
import fetch from 'node-fetch';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

async function startServer() {
  // Initialize Firebase Admin
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: firebaseConfig.projectId,
    });
  }
  const db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();

  // Initialize Groq
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    fetch: fetch as any,
  });

  const app = express();
  app.use(cors());
  app.use(express.json());

  // API routes
  app.post('/api/parse-dispatch', async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a campus delivery request parser. Parse the user's delivery request into a JSON object with these exact fields:
- pickup_location (string): where to pick up the item
- delivery_destination (string): where to deliver it
- item_description (string): what the item is
- offered_incentive_ngn (number): price offered in Naira (estimate if not specified, range 200-2000)
- estimated_urgency (string): one of "HIGH", "MEDIUM", or "LOW"

Respond with ONLY valid JSON, no extra text.`
          },
          {
            role: 'user',
            content: `Parse this campus delivery request: "${text}"`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const parsedData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Save to Firestore
      const jobRef = db.collection('dispatch_jobs').doc();
      const jobData = {
        ...parsedData,
        status: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      await jobRef.set(jobData);
      
      res.json({ id: jobRef.id, ...jobData });
    } catch (error: any) {
      console.error('NLP Error:', error);
      if (error.status === 429) {
        return res.status(429).json({ error: 'AI rate limit reached. Please wait a moment and try again.' });
      }
      if (error.status === 503) {
        return res.status(503).json({ error: 'AI model is busy. Please try again in a few seconds.' });
      }
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // Structured dispatch creation (no NLP)
  app.post('/api/create-dispatch', async (req, res) => {
    const { pickup_location, delivery_destination, item_description, offered_incentive_ngn, estimated_urgency } = req.body;

    if (!pickup_location || !delivery_destination || !item_description || offered_incentive_ngn == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const jobRef = db.collection('dispatch_jobs').doc();
      const jobData = {
        pickup_location,
        delivery_destination,
        item_description,
        offered_incentive_ngn: Number(offered_incentive_ngn),
        estimated_urgency: estimated_urgency || 'MEDIUM',
        status: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await jobRef.set(jobData);
      res.json({ id: jobRef.id, ...jobData });
    } catch (error) {
      console.error('Create dispatch error:', error);
      res.status(500).json({ error: 'Failed to create dispatch' });
    }
  });

  // AI Smart Suggest — recommends price & urgency
  app.post('/api/ai-suggest', async (req, res) => {
    const { pickup_location, delivery_destination, item_description } = req.body;

    if (!pickup_location || !delivery_destination || !item_description) {
      return res.status(400).json({ error: 'Pickup, destination, and item description are required' });
    }

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a pricing assistant for a campus delivery service at a Nigerian university. Suggest a fair price in Naira (NGN) and an urgency level.

Consider:
- Distance between locations on a typical Nigerian campus
- Type of item being delivered (fragile, heavy, documents, food, etc.)
- Typical student budgets (most deliveries range ₦200 - ₦2000)

Respond with ONLY a JSON object with these exact fields:
- suggested_price (number): fair price in Naira
- suggested_urgency (string): one of "HIGH", "MEDIUM", or "LOW"
- reasoning (string): brief explanation of your suggestion`
          },
          {
            role: 'user',
            content: `Pickup: "${pickup_location}"
Destination: "${delivery_destination}"
Item: "${item_description}"`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const suggestion = JSON.parse(response.choices[0].message.content || '{}');
      res.json(suggestion);
    } catch (error: any) {
      console.error('AI Suggest Error:', error);
      if (error.status === 429) {
        return res.status(429).json({ error: 'AI rate limit reached. Please wait a moment and try again.' });
      }
      if (error.status === 503) {
        return res.status(503).json({ error: 'AI model is busy. Please try again in a few seconds.' });
      }
      res.status(500).json({ error: 'AI suggestion failed' });
    }
  });

  app.post('/api/accept-job', async (req, res) => {
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const jobRef = db.collection('dispatch_jobs').doc(jobId);

    try {
      await db.runTransaction(async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        
        if (!jobDoc.exists) {
          throw new Error('NOT_FOUND');
        }

        const data = jobDoc.data();
        if (data?.status !== 'PENDING') {
          throw new Error('ALREADY_ASSIGNED');
        }

        transaction.update(jobRef, {
          status: 'ASSIGNED',
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'ALREADY_ASSIGNED') {
        return res.status(409).json({ error: 'Job already taken by another courier!' });
      } else if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Job not found' });
      }
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Failed to accept job' });
    }
  });

  // Vite integration
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

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
