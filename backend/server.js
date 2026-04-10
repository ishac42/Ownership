const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { getAccessToken } = require('./authentication');
const addRoute = require('./add'); 
const editRoute = require('./edit'); 
const deleteRoute = require('./delete'); 
const getEntityRoute = require('./getEntity'); 

const app = express();
app.use(express.json());

app.post('/api/retrieve-info', async (req, res) => {
  const { name, referenceNo } = req.body;

  try {
    const accessToken = await getAccessToken();

    const scriptResponse = await axios.post(
      'https://apis.accela.com/v4/scripts/API_GET_OWNER_INFO',
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
app.use(deleteRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});