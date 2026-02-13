const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { getAccessToken } = require('./authentication');
const addRoute = require('./add'); 
const editRoute = require('./edit'); 
const getEntityRoute = require('./getEntity'); 

const app = express();

// CORS configuration - allow requests from any origin
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Test POST route
app.post('/api/test', (req, res) => {
  console.log('>>> HIT /api/test route');
  res.json({ status: 'ok', message: 'POST works!' });
});

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.post('/api/retrieve-info', async (req, res) => {
  console.log('>>> HIT /api/retrieve-info route');
  const { name, referenceNo } = req.body;

  try {
    const accessToken = await getAccessToken();

    const scriptResponse = await axios.post(
      'https://apis.accela.com/v4/scripts/GET_OWNER_INFO',
      {
        "name": name,
        "reference number": referenceNo
      },
      {
        headers: {
          Authorization: accessToken
        }
      }
    );

    res.json({ success: true, data: scriptResponse.data });
  } catch (error) {
    console.error("Accela Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

app.use(addRoute);
app.use(editRoute);
app.use(getEntityRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
