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

// Local development: start the HTTP server
// On Vercel the file is imported as a serverless function — skip listen()
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`S3 Upload Microservice running on port ${PORT}`);
  });
}

module.exports = app;
