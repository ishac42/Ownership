const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

router.post('/api/get-entity-types', async (req, res) => {
  console.log("POST request received at /api/get-entity-types");

  try {
    // 1. Get the Token (as requested)
    const accessToken = await getAccessToken();

    // 2. get Standard choice values
    const scriptResponse = await axios.post('https://apis.accela.com/v4/scripts/GET_LIC_OWNERSHIP_TITLES', 
      {}, 
      {
        headers: { 
            'Authorization': accessToken
        }
      }
    );

    res.json({
        success: true,
        data: scriptResponse.data
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;