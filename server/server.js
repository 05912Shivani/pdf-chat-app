import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import { CohereClient } from 'cohere-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// -------------------- COHERE EMBEDDINGS CLASS --------------------
class CohereEmbeddings {
  constructor(apiKey, model = 'embed-english-v3.0') {
    if (!apiKey) throw new Error('Cohere API key is required');
    this.cohere = new CohereClient({ token: apiKey });
    this.model = model;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async withRetry(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retry ${i + 1}/${retries} after error:`, error.message);
        await new Promise((r) => setTimeout(r, this.retryDelay * (i + 1)));
      }
    }
  }

  async embedDocuments(texts) {
    try {
      return await this.withRetry(async () => {
        const response = await this.cohere.embed({
          texts,
          model: this.model,
          inputType: 'search_document',
        });
        return response.embeddings;
      });
    } catch (error) {
      console.error('Error generating embeddings:', error.message);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async embedQuery(text) {
    try {
      return await this.withRetry(async () => {
        const response = await this.cohere.embed({
          texts: [text],
          model: this.model,
          inputType: 'search_query',
        });
        return response.embeddings[0];
      });
    } catch (error) {
      console.error('Error generating query embedding:', error.message);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }
}

// -------------------- SIMPLE VECTOR STORE --------------------
class SimpleVectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
  }

  async addDocuments(docs, embeddings) {
    this.documents = docs;
    this.embeddings = embeddings;
  }

  cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }

  async similaritySearch(query, k = 3) {
    const sims = this.embeddings.map((emb, i) => ({
      index: i,
      similarity: this.cosineSimilarity(query, emb),
    }));
    sims.sort((a, b) => b.similarity - a.similarity);
    return sims.slice(0, k).map((s) => this.documents[s.index]);
  }

  save(filePath) {
    const data = {
      documents: this.documents,
      embeddings: this.embeddings,
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  }

  static load(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const store = new SimpleVectorStore();
    store.documents = data.documents;
    store.embeddings = data.embeddings;
    return store;
  }
}

// -------------------- CLIENTS --------------------
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const embeddings = new CohereEmbeddings(process.env.COHERE_API_KEY);

// -------------------- APP CONFIG --------------------
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// -------------------- FILE UPLOAD --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are allowed'));
  },
});

// -------------------- UTILS --------------------
function splitTextIntoChunks(text, chunkSize = 500, overlap = 100) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return [];

  const chunks = [];
  let start = 0;
  const len = text.length;

  while (start < len) {
    let end = Math.min(start + chunkSize, len);
    const nextSpace = text.lastIndexOf(' ', end);
    if (nextSpace > start + chunkSize / 2) end = nextSpace;
    chunks.push(text.slice(start, end).trim());
    if (end === len) break;
    start = end - overlap;
  }

  return chunks;
}

// -------------------- ROUTES --------------------
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Process PDF
app.post('/api/process-pdf', upload.single('file'), async (req, res) => {
  console.log('Received PDF upload request');

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const vectorStorePath = path.join(__dirname, 'vector-store.json');
  const processedChunks = [];
  let totalPages = 0;

  try {
    console.log(`Processing file: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
    }).promise;

    totalPages = pdf.numPages;
    console.log(`PDF loaded (${totalPages} pages)`);

    for (let i = 1; i <= totalPages; i++) {
      console.log(`Processing page ${i}/${totalPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ').trim();
      if (!pageText) continue;

      const chunks = splitTextIntoChunks(pageText);

      for (const chunk of chunks) {
        const embedding = await embeddings.embedQuery(chunk);
        await new Promise((r) => setTimeout(r, 300)); // prevent rate limit
        processedChunks.push({ content: chunk, embedding, page: i });
      }

      await page.cleanup();
    }

    const vectorStore = {
      chunks: processedChunks,
      metadata: {
        fileName: req.file.originalname,
        processedAt: new Date().toISOString(),
        totalPages,
        totalChunks: processedChunks.length,
      },
    };

    fs.writeFileSync(vectorStorePath, JSON.stringify(vectorStore));
    console.log('Vector store saved successfully');

    res.json({
      success: true,
      message: 'PDF processed successfully',
      pageCount: totalPages,
      chunkCount: processedChunks.length,
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process PDF',
      error: error.message,
    });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, chatHistory = [] } = req.body;
  const vectorStorePath = path.join(__dirname, 'vector-store.json');

  try {
    let contextText = '';
    if (fs.existsSync(vectorStorePath)) {
      const vectorData = JSON.parse(fs.readFileSync(vectorStorePath, 'utf-8'));
      const queryEmbedding = await embeddings.embedQuery(message);
      const scored = vectorData.chunks.map((chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }));
      const topChunks = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
      contextText = topChunks
        .map((c) => `[Page ${c.page}]: ${c.content}`)
        .join('\n\n');
    }

    const systemMessage = contextText
      ? `You are a helpful assistant. Use the following context:\n${contextText}`
      : 'You are a helpful assistant.';

    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    res.json({
      success: true,
      answer: completion.choices[0]?.message?.content || 'No response from AI',
    });
  } catch (error) {
    console.error('Error in chat completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get response from AI',
      error: error.message,
    });
  }
});

// -------------------- HELPERS --------------------
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// -------------------- SERVER START --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Allowed origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:5173'}`);
  console.log('🤖 Using Cohere for embeddings and Groq for chat');
});
