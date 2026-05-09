import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { databaseMongoClient } from '~/services/database.services';
import { defaultErrorHandler } from '~/middlewares/errors.middlewares';
import authRoutes from '~/routes/auth.routes';
import roadmapRoutes from '~/routes/roadmap.routes';
import resourceRoutes from '~/routes/resource.routes';

const app = express();
const port = process.env.PORT;

// Connect to DB via OOP wrapper
databaseMongoClient.connect();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/resources', resourceRoutes);

app.get('/', (req, res) => {
  res.send('AI Career Roadmap API (refactored) is running...');
});

// Centralized error boundary
app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Server is running at port ${port}`);
});
 
