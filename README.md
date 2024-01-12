# Running locally

run `npm i`

Create a project for the google API, make sure to have the calendar scope selected.

Create a project in Firebase, create a firestore database.


Obtain all the necessary API keys (Firebase & Google)

create and fill out a .env file in the project root which contains the following

```
CLIENT_ID= //Google client ID
CLIENT_SECRET= //Google client secret
REDIRECT_URI=http://localhost:4000/auth/google/callback
FIRESTORE_API_KEY=
FIRESTORE_PROJECT_ID=
FIRESTORE_AUTH_DOMAIN=
FIRESTORE_STORAGE_BUCKET=
MESSAGING_SENDER_ID=
FIRESTORE_APP_ID=
```

run `npm start`
