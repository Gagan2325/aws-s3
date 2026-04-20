require('dotenv').config();
const express = require('express');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', uploadRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`S3 Upload Microservice running on port ${PORT}`);
});
