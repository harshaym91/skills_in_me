import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import todoRoutes from './routes/todoRoutes.js';

const app = express();
const port = Number(process.env.PORT || 5000);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.use(morgan('tiny'));
app.get('/api/health', (request, response) => response.json({ ok: true, service: 'daymark-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.use((request, response) => response.status(404).json({ message: 'Route not found' }));
app.use((error, request, response, next) => { console.error(error); if (error.code === 11000) return response.status(409).json({ message: 'That value is already in use' }); response.status(500).json({ message: 'Something went wrong on the server' }); });

app.listen(port, () => console.log(`Daymark API listening on http://localhost:${port}`));
