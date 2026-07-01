# 🚚 DispatchIQ — AI-Powered Logistics, Fleet & Smart Dispatch Management Platform

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google GenAI](https://img.shields.io/badge/Google_GenAI-SDK-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Fast_LLM-F36F21)](https://groq.com/)

**DispatchIQ** is an intelligent, automated logistics and dispatch optimization web dashboard. Combining modern **React 19 + Tailwind CSS v4** frontend interfaces with an express backend powered by **Google GenAI** and **Groq LLM SDKs**, DispatchIQ streamlines real-time driver allocation, delivery route optimization, dispatch tracking, and automated fleet communications.

---

## ✨ Key Features

### 🧠 Dual-AI Optimization Engine (`server.ts`)
- **Route & Allocation Intelligence**: Integrates Google GenAI (`@google/genai`) and ultra-fast Groq LLMs (`groq-sdk`) to analyze delivery parameters, traffic patterns, and fleet availability.
- **Rate-Limited Secure API**: Express backend wrapped with `express-rate-limit` and CORS protection.

### 📊 Fluid Fleet Management Dashboard (`src/`)
- **Silky Transitions**: Built with `motion` (Framer Motion v12) for smooth real-time dispatch cards and vehicle status indicators.
- **Firebase Persistence**: Integrated with Firebase Admin SDK for reliable real-time database synchronization (`firestore.rules`).

---

## 🛠️ Technology Stack

| Component | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, Vite 6, Tailwind CSS v4, Motion, Lucide React |
| **Backend Engine** | Node.js, Express, TypeScript (`tsx`), ESBuild |
| **Artificial Intelligence** | Google GenAI SDK (`@google/genai`), Groq LLM SDK (`groq-sdk`) |
| **Database & Cloud** | Firebase SDK, Firebase Admin |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v18+
- **API Keys**: Google GenAI & Groq API keys

### 1. Install Dependencies
```bash
cd dispatchiq
npm install
```

### 2. Environment Setup (`.env`)
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Populate `GEMINI_API_KEY` and `GROQ_API_KEY`.

### 3. Start Development Server
```bash
npm run dev
```
Launches both the full-stack React frontend and Node backend simultaneously via `tsx`.

---

## 📄 License

Proprietary AI logistics platform. All rights reserved.
