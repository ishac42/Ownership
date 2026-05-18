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
    // 1. Get the Token (utilizing your existing auth module)
    const accessToken = await getAccessToken();

    // 2. Execute the Accela Custom Script
    // Note: Make sure the script name matches exactly what you named it in Accela
    const scriptResponse = await axios.post(
      'https://apis.accela.com/v4/scripts/API_GET_REVERSE_RELATIONS', 
      {
        "referenceNumbers": cleanRefs // This passes into aa.env.getValue("referenceNumbers")
      }, 
      {
        headers: { 
            'Authorization': accessToken,
            'Content-Type': 'application/json'
        }
      }
    );
    console.log("RETURNED dATA " + scriptResponse)
    // Extract the formatted data array from the Accela script's JSON wrapper
    // The exact path depends slightly on your Accela Construct API version response wrapper, 
    // but the script sets it to 'result.parents'
    const accelaData = scriptResponse.data?.result?.result?.parents || [];

    // Return the flat array directly to the frontend to populate the Split-Pane React component
    return res.status(200).json(accelaData);

  } catch (error) {
    console.error("Error in /api/reverseRelation:", error.message || error);
    res.status(500).json({ error: "An error occurred while fetching reverse relations." });
  }
});

module.exports = router;