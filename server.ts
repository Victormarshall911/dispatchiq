import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

async function startServer() {
  // Initialize Firebase Admin
  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  const db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
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
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Parse this campus delivery request into a structured format: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pickup_location: { type: Type.STRING },
              delivery_destination: { type: Type.STRING },
              item_description: { type: Type.STRING },
              offered_incentive_ngn: { type: Type.NUMBER },
              estimated_urgency: {
                type: Type.STRING,
                enum: ['HIGH', 'MEDIUM', 'LOW']
              }
            },
            required: ['pickup_location', 'delivery_destination', 'item_description', 'offered_incentive_ngn', 'estimated_urgency']
          }
        }
      });

      const parsedData = JSON.parse(response.text);
      
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
    } catch (error) {
      console.error('NLP Error:', error);
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
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are a pricing assistant for a campus delivery service at a Nigerian university. Based on the following delivery details, suggest a fair price in Naira (NGN) and an urgency level.

Consider:
- Distance between locations on a typical Nigerian campus
- Type of item being delivered (fragile, heavy, documents, food, etc.)
- Typical student budgets (most deliveries range ₦200 - ₦2000)

Pickup: "${pickup_location}"
Destination: "${delivery_destination}"
Item: "${item_description}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggested_price: { type: Type.NUMBER },
              suggested_urgency: {
                type: Type.STRING,
                enum: ['HIGH', 'MEDIUM', 'LOW']
              },
              reasoning: { type: Type.STRING }
            },
            required: ['suggested_price', 'suggested_urgency', 'reasoning']
          }
        }
      });

      const suggestion = JSON.parse(response.text);
      res.json(suggestion);
    } catch (error) {
      console.error('AI Suggest Error:', error);
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
