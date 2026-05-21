const axios = require('axios');
require('dotenv').config();

const CONFIG = {
  username: process.env.ACCELA_USERNAME,
  password: process.env.ACCELA_PASSWORD,
  agency: process.env.ACCELA_AGENCY,
  environment: process.env.ACCELA_ENVIRONMENT,
  scope: process.env.ACCELA_SCOPE || "run_emse_script"
};

const getAccessToken = async () => {
  try {
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'password');
    tokenParams.append('client_id', process.env.ACCELA_CLIENT_ID);
    tokenParams.append('client_secret', process.env.ACCELA_CLIENT_SECRET);
    tokenParams.append('username', CONFIG.username);
    tokenParams.append('password', CONFIG.password);
    tokenParams.append('agency_name', CONFIG.agency);
    tokenParams.append('environment', CONFIG.environment);
    tokenParams.append('scope', CONFIG.scope);

    const authResponse = await axios.post('https://apis.accela.com/oauth2/token', tokenParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return authResponse?.data?.access_token;
  } catch (error) {
    console.error("Error fetching token:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with Accela");
  }
};

module.exports = { getAccessToken };