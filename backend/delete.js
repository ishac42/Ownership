// backend/delete.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

router.delete('/api/delete-owner', async (req, res) => {
    // Extract the exact variables sent from your frontend
    const { referenceNbr, parentRefNbr } = req.body;
    
    try {
         // 1. Get the Token
        const accessToken = await getAccessToken();
        // 2. Trigger the Delete Script in Accela
        // Note: Accela custom scripts are always triggered via POST
        const scriptResponse = await axios.post(
            'https://apis.accela.com/v4/scripts/API_DELETE_OWNER_INFO', 
            { 
                "referenceNbr": referenceNbr,
                "parentRefNbr": parentRefNbr
            }, 
            {
                headers: { 
                    'Authorization': accessToken
                }
            }
        );
        
        // 3. Return the Script Result
        res.json({
            success: true,
            data: scriptResponse.data
        });

    } catch (error) {
        console.error("Accela Error:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
});

module.exports = router;