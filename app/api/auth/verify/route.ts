import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getSpreadsheetId } from '../../../../lib/googleSheets';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, license_key } = body;

        if (!email || !license_key) {
            return NextResponse.json({ error: 'Email and License Key are required' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = getSpreadsheetId();

        // Assuming sheet name is 'licenses' and columns are:
        // A: Email, B: Key, C: Plan, D: Status, E: ActivatedAt, F: ExpiresAt, G: MaxQ, H: QToday, I: LastQDate
        let response;
        try {
            response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'licenses!A:I',
            });
        } catch (err: any) {
            return NextResponse.json({ error: 'Lỗi Google Sheets: Vui lòng đổi tên Sheet thành "licenses"' }, { status: 500 });
        }

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Không tìm thấy dữ liệu cấp phép' }, { status: 404 });
        }

        // Headers are row 0. Find the row matching email and key
        let userRowIndex = -1;
        let userData = null;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Normalize case to prevent issues
            if (row[0]?.toLowerCase().trim() === email.toLowerCase().trim() && row[1]?.trim() === license_key.trim()) {
                userRowIndex = i;
                userData = row;
                break;
            }
        }

        if (!userData) {
            return NextResponse.json({ error: 'Thông tin đăng nhập không hợp lệ' }, { status: 401 });
        }

        // Check Status and ExpiresAt
        const status = userData[3];
        const expiresAt = new Date(userData[5]);

        if (status === 'pending') {
            // Auto-activate the license on first valid login
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `licenses!D${userRowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['active']] },
            });
        } else if (status !== 'active') {
            return NextResponse.json({ error: 'Tài khoản đang bị khóa hoặc không hợp lệ' }, { status: 403 });
        }

        if (expiresAt < new Date()) {
            return NextResponse.json({ error: 'Giấy phép đã hết hạn' }, { status: 403 });
        }

        return NextResponse.json({
            user: {
                email: userData[0],
                plan: userData[2],
            },
            expiresAt: expiresAt.toISOString(),
        });

    } catch (error: any) {
        console.error('Verify Auth Error:', error);
        return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
    }
}
