import axios from "axios";
import * as querystring from "querystring";
require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

export const refreshAuthToken = async (refreshToken: string): Promise<string> => {
  const refreshResponse = await axios.post(
    "https://oauth2.googleapis.com/token",
    querystring.stringify({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  const newAccessToken = refreshResponse.data.access_token;
  return newAccessToken;
};
