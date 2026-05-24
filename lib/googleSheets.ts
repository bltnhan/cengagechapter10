import { google } from 'googleapis';

export async function getGoogleSheetsClient() {
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    // Handle escaped newlines in environment variables
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !privateKey) {
        throw new Error('Google credentials not found in environment variables.');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: privateKey,
        },
        // We need read/write scope to update queries_today
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
}

export const getSpreadsheetId = () => {
    const id = process.env.GOOGLE_SHEET_ID;
    if (!id) {
        throw new Error('Google Sheet ID not found in environment variables.');
    }
    return id;
};
