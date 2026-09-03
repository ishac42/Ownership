const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication'); // Sourced from your architecture

router.post('/api/reverseRelation', async (req, res) => {
  

  try {
    const { referenceNumbers } = req.body;
    
    // Failsafe: return empty array if no references were passed
    if (!referenceNumbers || !Array.isArray(referenceNumbers) || referenceNumbers.length === 0) {
      return res.status(200).json([]);
    }
    
    // Sanitize, deduplicate, and join into a comma-separated string for the SQL script
    const cleanRefs = [...new Set(referenceNumbers.map(String))].join(",");
    console.log("POST request received at /api/reverseRelation " + cleanRefs);
    const accessToken = await getAccessToken();

    const scriptResponse = await axios.post(
      'https://apis.accela.com/v4/scripts/API_GET_REVERSE_RELATIONS', 
      {
        "referenceNumbers": cleanRefs
      }, 
      {
        headers: { 
            'Authorization': accessToken,
            'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    let payload = scriptResponse.data?.result?.result ?? scriptResponse.data?.result ?? scriptResponse.data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (parseErr) {
        console.error("Reverse relation result was a non-JSON string");
        payload = {};
      }
    }

    const accelaData = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.parents) ? payload.parents : []);

    if (accelaData.length === 0) {
      console.warn("Reverse relation returned no parents", {
        returnValue: payload?.returnValue || scriptResponse.data?.result?.returnValue,
        messages: payload?.messages,
        payloadType: Array.isArray(payload) ? 'array' : typeof payload
      });
    }

    return res.status(200).json(accelaData);

  } catch (error) {
    console.error("Error in /api/reverseRelation:", error.message || error);
    res.status(500).json({ error: "An error occurred while fetching reverse relations." });
  }
});

module.exports = router;