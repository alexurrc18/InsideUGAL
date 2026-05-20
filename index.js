const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pentru a parsa JSON din request body
app.use(express.json());

// GET /health - Endpoint pentru verificarea stării serverului
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Backend-ul InsideUGAL rulează cu succes!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serverul a pornit și rulează pe http://localhost:${PORT}`);
});