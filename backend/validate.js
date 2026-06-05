// backend/validate.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

router.post('/api/validate-ownership', async (req, res) => {
    const { dob, ownerArr } = req.body;

    try {
        const accessToken = await getAccessToken();

        const scriptResponse = await axios.post(
            'https://apis.accela.com/v4/scripts/API_VALIDATE_OWNERSHIP_PORTAL',
            {
                dob: dob || '',
                ownerArr: ownerArr || ''
            },
            {
                headers: {
                    Authorization: accessToken
                }
            }
        );

        const accelaResult = scriptResponse.data;
        const validation =
            accelaResult?.result?.result ||
            accelaResult?.result ||
            accelaResult;

        const blocked = validation?.blocked === true;

        res.json({
            success: true,
            data: accelaResult,
            blocked,
            message: validation?.message || '',
            age: typeof validation?.age === 'number' ? validation.age : -1
        });
    } catch (error) {
        console.error('Accela validation error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            blocked: true,
            message: error.response?.data?.message || error.message || 'Validation request failed',
            error: error.response?.data?.message || error.message
        });
    }
});

module.exports = router;
