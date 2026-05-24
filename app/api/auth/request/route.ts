import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getSpreadsheetId } from '../../../../lib/googleSheets';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = getSpreadsheetId();

        // Get existing rows to check for duplicates
        let response;
        try {
            response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'licenses!A:A',
            });
        } catch (err: any) {
            return NextResponse.json({ error: 'Lỗi kết nối CSDL ảo. Bạn đã đổi tên tab Google Sheets thành "licenses" chưa?' }, { status: 500 });
        }

        const rows = response.data.values || [];

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0]?.toLowerCase().trim() === email.toLowerCase().trim()) {
                return NextResponse.json({ error: 'Email này đã tồn tại trên hệ thống hoặc đã gửi yêu cầu rồi!' }, { status: 400 });
            }
        }

        const today = new Date();
        const activatedAtStr = today.toISOString().split('T')[0];
        const expireDate = new Date(today);
        expireDate.setMonth(expireDate.getMonth() + 3);
        const expiresAtStr = expireDate.toISOString().split('T')[0];

        // Add user row
        // A: Email, B: Key, C: Plan, D: Status, E: ActivatedAt, F: ExpiresAt, G: MaxQ, H: QToday, I: LastQDate
        const newRow = [
            email,
            'Google Auth', // No more Random License Key needed
            'Basic', // Default Plan
            'pending', // Status
            activatedAtStr, // ActivatedAt (Hôm nay)
            expiresAtStr, // ExpiresAt (3 tháng sau)
            '50', // Default MaxQ
            '0', // QToday
            '' // LastQDate
        ];

        // Ensure headers exist if this is the first entry
        if (rows.length === 0) {
            const headers = ['Email', 'Key', 'Plan', 'Status', 'ActivatedAt', 'ExpiresAt', 'MaxQ', 'QToday', 'LastQDate'];
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'licenses!A1:I1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [headers] },
            });
        }

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'licenses!A:I',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow],
            },
        });

        return NextResponse.json({ message: 'Yêu cầu cấp Key thành công!' });
    } catch (error: any) {
        console.error('Request License Error:', error);
        return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
    }
}
