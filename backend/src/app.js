import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import analyze from './routes/analyze.js';
import recompute from './routes/recompute.js';
import narrative from './routes/narrative.js';
import price from './routes/price.js';
import health from './routes/health.js';
import report from './routes/report.js';
import chat from './routes/chat.js';
import analyses from './routes/analyses.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/files', express.static(env.uploadDir)); // buka PDF sumber: /files/<id>.pdf#page=N
app.use('/api/analyze', analyze);
app.use('/api/recompute', recompute);
app.use('/api/narrative', narrative);
app.use('/api/price', price);
app.use('/api/health', health);
app.use('/api/report', report); // FR-OUT-01
app.use('/api/chat', chat); // Chatbot Tahap 1
app.use('/api/analyses', analyses);

app.use(errorHandler);
export default app;