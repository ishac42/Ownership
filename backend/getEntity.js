const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAccessToken } = require('./authentication');

/**
 * Loads ownership portal standard choices from Accela script API_GET_LIC_OWNERSHIP_TITLES:
 * - titles (LIC_Ownership_Titles) — entity / ownership title
 * - addresses (LIC_OWNERSHIP_ADDRESSES)
 * - professionals (LIC_OWNERSHIP_PROFESSIONALS)
 */
router.post('/api/get-entity-types', async (req, res) => {
  console.log("POST request received at /api/get-entity-types");

  try {
    const accessToken = await getAccessToken();

    const scriptResponse = await axios.post(
      'https://apis.accela.com/v4/scripts/API_GET_LIC_OWNERSHIP_TITLES',
      {},
      {
        headers: {
          Authorization: accessToken,
        },
      }
    );

    res.json({
      success: true,
      data: scriptResponse.data,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;