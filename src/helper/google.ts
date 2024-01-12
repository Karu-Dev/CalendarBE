import axios from "axios";

export const getCalendarResponse = async (accessToken: string) => {
  const now = new Date().toISOString();
  try {
    const calendarResponse = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const calendarData = calendarResponse.data.items;
    return calendarData;
  } catch (e) {
    console.log(e);
    return [];
  }
};
