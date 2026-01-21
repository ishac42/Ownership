// backend/add.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');


router.post('/api/add-owner', async (req, res) => {
    const { newAsitArr, fein, ssn, parentRefNbr } = req.body;
    try {
         // 1. Get the Token
        const accessToken = await getAccessToken();
        
        // 2. add Owner ASIT TRIGGER THE SCRIPT
        const scriptResponse = await axios.post(
        'https://apis.accela.com/v4/scripts/ADD_OWNER_INFO', 
            { 
                "newAsitArr": newAsitArr, 
                "fein": fein,
                "ssn" : ssn,
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
