import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getSpreadsheetId } from '../../../../lib/googleSheets';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { idToken } = body;

        if (!idToken) {
            return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
        }

        // Verify ID Token with Google
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        const tokenInfo = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: 'Token Google không hợp lệ hoặc đã hết hạn.' }, { status: 401 });
        }

        const email = tokenInfo.email;
        const name = tokenInfo.name;
        const avatar = tokenInfo.picture;

        if (!email) {
            return NextResponse.json({ error: 'Không thể lấy email từ tài khoản Google.' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = getSpreadsheetId();

        // Assuming sheet name is 'licenses' and columns are:
        // A: Email, B: Key, C: Plan, D: Status, E: ActivatedAt, F: ExpiresAt, G: MaxQ, H: QToday, I: LastQDate
        let sheetResponse;
        try {
            sheetResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'licenses!A:F', // Chuyển sang lấy tới F vì ta không dùng MaxQ, QToday nữa, nhưng để an toàn lấy tới I luôn.
            });
            // Thực tế lấy tới I để không lệch format cũ
            sheetResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'licenses!A:I',
            });
        } catch (err: any) {
            return NextResponse.json({ error: 'Lỗi Google Sheets: Vui lòng kiểm tra quyền truy cập hoặc tên tab "licenses"' }, { status: 500 });
        }

        const rows = sheetResponse.data.values;
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Không tìm thấy dữ liệu cấp phép trên hệ thống.' }, { status: 404 });
        }

        let userRowIndex = -1;
        let userData = null;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[0]?.toLowerCase().trim() === email.toLowerCase().trim()) {
                userRowIndex = i;
                userData = row;
                break;
            }
        }

        if (!userData) {
            // Auto-create a 30-day Free Trial!
            const activatedAtStr = new Date().toISOString().split('T')[0];
            const expiresAtDateTime = new Date();
            expiresAtDateTime.setDate(expiresAtDateTime.getDate() + 30);
            const expiresAtStr = expiresAtDateTime.toISOString().split('T')[0];

            // Format: A: Email, B: Key, C: Plan, D: Status, E: ActivatedAt, F: ExpiresAt, G: MaxQ, H: QToday, I: LastQDate
            const newKey = `LICENSE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            const newRow = [
                email, // A: Email
                newKey, // B: Key 
                'TRIAL', // C: Plan
                'active', // D: Status
                activatedAtStr, // E: ActivatedAt
                expiresAtStr, // F: ExpiresAt
                '50', // G: MaxQ
                '0', // H: QToday
                '' // I: LastQDate
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'licenses!A:I',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [newRow] }
            });

            userData = newRow;
        }

        // Check Status and ExpiresAt
        const status = userData[3];
        const expiresAt = new Date(userData[5]);

        if (status === 'pending') {
            // Auto-activate the license on first valid login
            const activatedAtStr = new Date().toISOString().split('T')[0];
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `licenses!D${userRowIndex + 1}:E${userRowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['active', activatedAtStr]] },
            });
        } else if (status !== 'active') {
            return NextResponse.json({ error: 'Tài khoản đang bị khóa hoặc không hợp lệ.' }, { status: 403 });
        }

        if (expiresAt < new Date()) {
            return NextResponse.json({ error: 'Giấy phép đã hết hạn. Vui lòng liên hệ Admin.' }, { status: 403 });
        }

        return NextResponse.json({
            user: {
                email: userData[0],
                plan: userData[2],
                name: name,
                avatar: avatar
            },
            expiresAt: expiresAt.toISOString(),
        });

    } catch (error: any) {
        console.error('Google Verify Auth Error:', error);
        return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
    }
}
