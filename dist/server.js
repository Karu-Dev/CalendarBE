"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
require("firebase/firestore");
const querystring = __importStar(require("querystring"));
const firestore_1 = require("firebase/firestore");
const app_1 = require("firebase/app");
const uuid_1 = require("uuid");
const jwt = __importStar(require("jsonwebtoken"));
const auth_1 = require("./helper/auth");
const google_1 = require("./helper/google");
require("dotenv").config();
const expressApp = (0, express_1.default)();
const PORT = 4000;
const firebaseConfig = {
    apiKey: "AIzaSyCkJcQkcNQfe2nTUaeqedEkkWdUn-zeGfI",
    authDomain: "api-db-af81d.firebaseapp.com",
    projectId: "api-db-af81d",
    storageBucket: "api-db-af81d.appspot.com",
    messagingSenderId: "734982305352",
    appId: "1:734982305352:web:0026c6dbe9d0371bdf4a7d",
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const db = (0, firestore_1.getFirestore)(app);
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
expressApp.get("/auth/google", (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?${querystring.stringify({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "profile email openid https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
    })}`;
    res.redirect(googleAuthUrl);
});
expressApp.get("/auth/google/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send("Code not found");
    }
    try {
        const { data } = await axios_1.default.post("https://oauth2.googleapis.com/token", querystring.stringify({
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
        }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        const decodedToken = jwt.decode(data.id_token, { complete: true });
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const usersCollection = (0, firestore_1.collection)(db, "usersCollection");
        let user = null;
        const q = (0, firestore_1.query)(usersCollection, (0, firestore_1.where)("email", "==", decodedToken.payload.email));
        const userFound = await (0, firestore_1.getDocs)(q);
        if (userFound.size === 0) {
            const newUserId = (0, uuid_1.v4)();
            const newUser = {
                accessToken,
                refreshToken,
                userId: newUserId,
                email: decodedToken.payload.email,
                tokenExpires: Date.now() + 3000 * 1000,
            };
            user = newUser;
            await (0, firestore_1.addDoc)(usersCollection, newUser);
        }
        else {
            const matchingDocument = userFound.docs[0].data();
            user = matchingDocument;
        }
        res.redirect(`http://localhost:3000/login?userId=${user.userId}`);
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    }
});
expressApp.get("/getCalendar", async (req, res) => {
    const userId = req.query.userId;
    try {
        const usersCollection = (0, firestore_1.collection)(db, "usersCollection");
        const q = (0, firestore_1.query)(usersCollection, (0, firestore_1.where)("userId", "==", userId));
        const userFound = await (0, firestore_1.getDocs)(q);
        const matchingDocument = userFound.docs[0].data();
        const user = matchingDocument;
        if (userFound.size === 0) {
            res.json("No.");
            return;
        }
        else {
            if (user.tokenExpires < Date.now()) {
                const authToken = await (0, auth_1.refreshAuthToken)(user.refreshToken);
                const calendarItems = await (0, google_1.getCalendarResponse)(authToken);
                const userDoc = (0, firestore_1.doc)(usersCollection, userFound.docs[0].id);
                await (0, firestore_1.updateDoc)(userDoc, {
                    ["accessToken"]: authToken,
                    ["tokenExpires"]: (Date.now() + 3000 * 1000),
                });
                res.json(calendarItems);
            }
            const calendarItems = await (0, google_1.getCalendarResponse)(user.accessToken);
            res.json(calendarItems);
        }
    }
    catch (error) {
        // console.log(error);
        res.status(500).json({ error: error.message });
    }
});
expressApp.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
