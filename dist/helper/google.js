"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarResponse = void 0;
const axios_1 = __importDefault(require("axios"));
const getCalendarResponse = async (accessToken) => {
    const now = new Date().toISOString();
    try {
        const calendarResponse = await axios_1.default.get(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=10`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const calendarData = calendarResponse.data.items;
        return calendarData;
    }
    catch (e) {
        console.log(e);
        return [];
    }
};
exports.getCalendarResponse = getCalendarResponse;
