// backend/validate.js — proxy only; rules live in API_VALIDATE_OWNERSHIP_PORTAL (EMSE)
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

function extractScriptResult(accelaResult) {
    return (
        accelaResult?.result?.result ||
        accelaResult?.result ||
        accelaResult ||
        {}
    );
}

router.post('/api/validate-ownership', async (req, res) => {
    const { dob, ownerArr, capId } = req.body;

    try {
        const accessToken = await getAccessToken();

        const scriptResponse = await axios.post(
            'https://apis.accela.com/v4/scripts/API_VALIDATE_OWNERSHIP_PORTAL',
            {
                dob: dob || '',
                ownerArr: ownerArr || '',
                capId: capId || ''
            },
            {
                headers: {
                    Authorization: accessToken
                }
            }
        );

        const accelaResult = scriptResponse.data;
        const validation = extractScriptResult(accelaResult);

        res.json({
            success: true,
            data: accelaResult,
            blocked: validation.blocked === true,
            message: validation.message || '',
            age: typeof validation.age === 'number' ? validation.age : -1
        });
    } catch (error) {
        console.error('Accela validation proxy error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || '',
            error: error.response?.data?.message || error.message
        });
    }
});

module.exports = router;
