// src/server.ts
import express, { Request, Response } from "express";
import axios from "axios";
import "firebase/firestore";
import * as querystring from "querystring";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { v4 as uuidv4 } from "uuid";
import * as jwt from "jsonwebtoken";
import { refreshAuthToken } from "./helper/auth";
import { getCalendarResponse } from "./helper/google";
var cors = require("cors");
require("dotenv").config();

const expressApp = express();
expressApp.use(cors());
expressApp.options("*", cors());
const PORT = 4000;
const firebaseConfig = {
  apiKey: process.env.FIRESTORE_API_KEY,
  authDomain: process.env.FIRESTORE_AUTH_DOMAIN,
  projectId: process.env.FIRESTORE_PROJECT_ID,
  storageBucket: process.env.FIRESTORE_STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.FIRESTORE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
interface UserInterface {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  tokenExpires: number;
}

expressApp.get("/auth/google", (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?${querystring.stringify(
    {
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope:
        "profile email openid https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
    }
  )}`;

  res.redirect(googleAuthUrl);
});

expressApp.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Code not found");
  }

  try {
    const { data } = await axios.post(
      "https://oauth2.googleapis.com/token",
      querystring.stringify({
        code: code as string,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const decodedToken: any = jwt.decode(data.id_token, { complete: true });

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const usersCollection = collection(db, "usersCollection");
    let user: UserInterface | null = null;

    const q = query(
      usersCollection,
      where("email", "==", decodedToken.payload.email)
    );
    const userFound = await getDocs(q);

    if (userFound.size === 0) {
      const newUserId = uuidv4();
      const newUser = {
        accessToken,
        refreshToken,
        userId: newUserId,
        email: decodedToken.payload.email,
        tokenExpires: Date.now() + 3000 * 1000,
      };
      user = newUser;
      await addDoc(usersCollection, newUser);
    } else {
      const matchingDocument = userFound.docs[0].data();
      user = matchingDocument as UserInterface;
    }
    res.redirect(`http://localhost:3000/login?userId=${user.userId}`);
  } catch (error: any) {
    res.status(500).send("Internal Server Error");
  }
});

expressApp.get("/logout", async (req: Request, res: Response) => {
  const usersCollection = collection(db, "usersCollection");
  const q = query(usersCollection, where("userId", "==", req.query.userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.size === 0) {
    res.json("NOT FOUND");
    return;
  }
  const userDoc = querySnapshot.docs[0];
  const userRef = doc(usersCollection, userDoc.id);

  await deleteDoc(userRef);
  res.json("OK");
});

expressApp.get("/getCalendar", async (req: Request, res: Response) => {
  const userId = req.query.userId;

  try {
    const usersCollection = collection(db, "usersCollection");
    const q = query(usersCollection, where("userId", "==", userId));
    const userFound = await getDocs(q);

    const matchingDocument = userFound.docs[0].data();
    const user = matchingDocument as UserInterface;

    if (userFound.size !== 0) {
      if (user.tokenExpires < Date.now()) {
        const authToken = await refreshAuthToken(user.refreshToken);
        const calendarItems = await getCalendarResponse(authToken);
        const userDoc = doc(usersCollection, userFound.docs[0].id);

        await updateDoc(userDoc, {
          ["accessToken"]: authToken,
          ["tokenExpires"]: Date.now() + 3000 * 1000,
        });
        res.json(calendarItems);
        return;
      }
      const calendarItems = await getCalendarResponse(user.accessToken);

      res.json(calendarItems);
      return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

expressApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
