// backend/edit.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

router.post('/api/edit-owner', async (req, res) => {
    // 1. Destructure input
    const { editArray, editRefNbr, parentRefNbr } = req.body;

    try {
        console.log(`[EDIT OWNER] Updating Ref: ${editRefNbr}, Items: ${editArray?.length}`);
        console.log(editArray)
        // 2. Get the Token
        const accessToken = await getAccessToken();
        
        // 3. Trigger Accela Script
        const scriptResponse = await axios.post(
            'https://apis.accela.com/v4/scripts/EDIT_OWNER_INFO', 
            { 
                "editArray": editArray, 
                "editRefNbr": editRefNbr,
                "parentRefNbr": parentRefNbr
            }, 
            {
                headers: { 
                    'Authorization': accessToken
                }
            }
        );
        const accelaResult = scriptResponse.data;

        console.log("[ACCELA RESPONSE]", accelaResult.result.result.messages);

        res.json({
            success: true,
            data: accelaResult
        });

    } catch (error) {
        console.error("Error in Edit script:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
});

module.exports = router;