import { useAppStore } from '../hooks/store';

// ==========================================
// 🇻🇳 TIẾNG VIỆT
// ==========================================
const vi = {
    // Common
    'common.close': 'Đóng',
    'common.save': 'Lưu',
    'common.cancel': 'Huỷ bỏ',
    'common.delete': 'Xóa',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',

    // Header / Auth
    'header.hello': 'Xin chào',
    'header.quota': 'Hạn mức',
    'header.settings': 'Cài đặt',
    'auth.loginGoogle': 'Đăng nhập bằng Google',
    'auth.loginFailed': 'Đăng nhập thất bại. Vui lòng thử lại.',
    'auth.expiresAt': 'Hết hạn: {date} (Còn {days} ngày)',
    'auth.expiresUnknown': 'Hết hạn: (Vui lòng đăng nhập lại để cập nhật)',
    'auth.logout': 'Thoát',
    'auth.requestSuccess': 'Yêu cầu cấp Key thành công!',
    'auth.errorOccurred': 'Có lỗi xảy ra.',
    'auth.loginTitle': 'Đăng nhập DataLens',
    'auth.requestTitle': 'Yêu cầu cấp tài khoản',
    'auth.loginDesc': 'Đăng nhập bằng tài khoản Google để tiếp tục',
    'auth.requestDesc': 'Điền Email Google của bạn để Admin cấp tài khoản sử dụng',
    'auth.authenticating': 'Đang xác thực...',
    'auth.sendRequest': 'Gửi yêu cầu',
    'auth.noAccountSwitch': 'Chưa có tài khoản? Có thể xin cấp ở đây!',
    'auth.backToLogin Switch': 'Trở về màn hình đăng nhập Google',

    // Settings Modal
    'settings.title': 'Cài đặt Hệ thống',
    'settings.apiKeyNote': 'Lưu ý: API Key sẽ được lưu trên trình duyệt của bạn (Local Storage) và chỉ gửi an toàn đến Backend khi cần tương tác với AI.',
    'settings.apiKeyLabel': 'Gemini API Key',
    'settings.apiKeyPlaceholder': 'AIzaSy...',
    'settings.noApiKey': 'Chưa có API Key?',
    'settings.getApiKey': 'Lấy API miễn phí tại Google AI Studio',
    'settings.chatModel': 'Model Chat (AI)',
    'settings.chatModelNote': 'Dùng cho trợ lý AI',
    'settings.insightModel': 'Model Phân tích',
    'settings.insightModelNote': 'Dùng cho Insights & TMDL Analysis',
    'settings.privacyShield': 'Bật Privacy Shield',
    'settings.privacyShieldNote': 'Tự động làm mờ dữ liệu nhạy cảm (PII) khi tải lên và phân tích',
    'settings.chatFullscreen': 'Nổi Chatbox AI trên Fullscreen',
    'settings.chatFullscreenNote': 'Hiển thị tuỳ chọn hỏi trợ lý AI ngay cả khi đang mở rộng màn hình',
    'settings.systemRole': 'System Role (AI Persona)',
    'settings.saveSuccess': 'Đã lưu cài đặt',
    'settings.language': 'Ngôn ngữ (Language)',
    'common.scrollToTop': 'Cuộn lên đầu trang',

    // Prompt Studio / Template Gallery
    'prompt.allCategories': 'Tất cả',
    'prompt.templateLibrary': 'Thư viện Mẫu (Templates)',
    'prompt.searchTemplates': 'Tìm kiếm mẫu prompt...',
    'prompt.noTemplates': 'Không tìm thấy mẫu prompt nào phù hợp với tìm kiếm của bạn.',

    // Upload Zone
    'upload.dataAnalysis': '📊 Phân tích Dữ liệu',
    'upload.dataAnalysisDesc': 'Tải file dữ liệu để xem Data Profile, dùng Prompt Studio và Chat AI.',
    'upload.dataSupport': 'Hỗ trợ: .xlsx, .xlsm, .xls, .csv',
    'upload.powerBiModel': '⚡ Power BI Model',
    'upload.powerBiDesc': 'Tải thư mục chứa TMDL để phân tích và xem cấu trúc Semantic Model.',
    'upload.powerBiSupport': 'Hỗ trợ: Thư mục TMDL',
    'upload.privacyNote': 'Dữ liệu của bạn chỉ được xử lý tạm thời trên trình duyệt, không lưu trữ trên máy chủ.',
    'upload.processing': 'Đang xử lý dữ liệu...',
    'upload.errorFormat': 'File không đúng định dạng. Vui lòng tải lên file CSV, Excel, XML hoặc JSON.',
    'upload.errorRead': 'Không thể đọc dữ liệu từ file.',
    'upload.errorLimit': 'File quá lớn. Vui lòng chọn file dưới 50MB.',
    'upload.parseOptions': 'Tùy chỉnh Đọc Dữ Liệu',
    'upload.headerRowTooltip': 'Dòng chứa Header',
    'upload.startRow': 'Dòng bắt đầu',
    'upload.auto': 'Auto',
    'upload.firstColTooltip': 'Cột chứa dữ liệu đầu tiên',
    'upload.startCol': 'Cột bắt đầu',
    'upload.reading': 'Đang đọc...',
    'upload.applyRead': 'Áp dụng & Đọc lại file',
    'upload.tables': 'bảng',
    'upload.columns': 'cột',
    'upload.rows': 'dòng',
    'upload.sheet': 'Sheet:',

    // Tabs
    'tab.upload': 'Tải lên',
    'tab.dataProfile': 'Hồ sơ Dữ liệu',
    'tab.formulaGraph': 'Đồ thị Công thức',
    'tab.promptStudio': 'Phân tích AI',
    'tab.aiChat': 'Trợ lý AI',
    'tab.tmdlProfile': 'TMDL Model',

    // Homepage
    'home.noApiKeyTitle': 'Chưa có API Key!',
    'home.noApiKeyDesc': 'Bạn cần nhập Gemini API Key để sử dụng các tính năng AI.',
    'home.openSettings': 'Mở Cài đặt',
    'home.footer': 'DataLens v1.0 — Data stays on your browser, insights go everywhere ✨',

    // Profile & Data
    'profile.title': '📊 Hồ sơ Dữ liệu',
    'profile.exportPdf': 'Xuất PDF',
    'profile.totalRows': 'Tổng số dòng',
    'profile.totalCols': 'Tổng số cột',
    'profile.piiCols': 'Cột nhạy cảm (PII)',
    'profile.colDetails': 'Chi tiết các Cột',
    'profile.colName': 'Tên Cột',
    'profile.colType': 'Kiểu dữ liệu',
    'profile.nullRate': 'Tỷ lệ Null',
    'profile.status': 'Trạng thái',
    'profile.unique': 'Unique',
    'profile.dataSample': 'Mẫu dữ liệu',
    'profile.issues': 'Vấn đề',
    'profile.clickToChangeType': 'Nhấn để đổi kiểu dữ liệu',
    'profile.clickToViewDetails': 'Nhấn để xem chi tiết',
    'profile.issuesCount': 'vấn đề',
    'profile.typeDistribution': 'Phân bố kiểu dữ liệu',
    'profile.missingDataCols': 'Cột thiếu dữ liệu (Null)',
    'profile.correlationMatrix': 'Ma trận Tương quan (Correlation Matrix)',
    'profile.insightsTitle': 'Phân tích & Đề xuất (Insights)',
    'profile.recommendation': 'Đề xuất:',
    'profile.issueAtCol': 'Vấn đề tại cột:',
    'profile.exampleSample': 'Ví dụ mẫu:',
    'profile.understood': 'Đã hiểu',
    'preview.title': 'Dữ liệu xem trước',
    'preview.totalRows': 'tổng dòng',
    'preview.showing': 'Đang hiển thị',
    'preview.outOf': 'trên tổng số',
    'profile.stats': 'Cột Dữ liệu',
    'profile.quality': 'Điểm chất lượng',
    'profile.generateInsights': 'Sinh Insights Tự động',
    'profile.generatingInsights': 'Đang phân tích...',
    'profile.downloadInsights': 'Tải báo cáo (Markdown)',
    'profile.autoInsightsDescription': 'Sử dụng AI để tự động phát hiện các mẫu, giá trị ngoại lai và xu hướng ẩn trong dữ liệu của bạn.',

    // Prompt Studio
    'prompt.title': '✨ Smart Prompt',
    'prompt.autoDetectDomain': 'Ngành nghề dự đoán (Auto-detect):',
    'prompt.privacyMode': 'Chỉ gửi metadata, không lộ dữ liệu thực',
    'prompt.sampleMode': 'Metadata + 5 dòng mẫu đã anonymize',
    'prompt.fullMode': 'Gửi toàn bộ dữ liệu (Chỉ dùng khi an toàn)',
    'prompt.clearContext': 'Xóa ngữ cảnh',
    'prompt.quickSuggestions': 'Gợi ý phân tích nhanh (1-Click Run):',
    'prompt.customRequest': '🎯 Hoặc nhập yêu cầu phân tích tuỳ chỉnh:',
    'prompt.customPlaceholder': 'Ví dụ: Phân tích doanh số theo tháng, tìm top 10 sản phẩm bán chạy nhất, so sánh chi nhánh Bắc vs Nam...',
    'prompt.output': 'Prompt Output',
    'prompt.chars': 'ký tự',
    'prompt.copyPrompt': 'Copy Prompt',
    'prompt.openGemini': 'Mở Gemini Web',
    'prompt.needApiKey': 'Cần cài đặt API Key',
    'prompt.sendDirect': 'Gửi trực tiếp đến Gemini API',
    'prompt.sending': 'Đang gửi...',
    'prompt.sendGemini': 'Gửi Gemini & Nhận kết quả',

    // AI Chat & Response
    'chat.reportTitle': 'DataLens - AI Analysis Report',
    'chat.analyzing': 'Đang phân tích dữ liệu...',
    'chat.quotaError': 'Hệ thống AI đang quá tải hoặc bạn đã dùng hết lượt truy vấn miễn phí. Vui lòng thử lại sau ít phút nhé!',
    'chat.networkError': 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet và thử lại.',
    'chat.apiError': 'Đã có sự cố bất ngờ khi kết nối với AI. Vui lòng thử lại (Error: API Fault).',
    'chat.oopsError': 'Oops! Lỗi phát sinh',
    'chat.retry': 'Thử lại',
    'chat.noReport': 'Chưa có Báo cáo Phân tích',
    'chat.emptyStateDesc': 'Bạn có thể chọn template từ Prompt Studio để xuất báo cáo, hoặc bắt đầu trò chuyện trực tiếp để phân tích sâu hơn về {filename}.',
    'chat.openAiChat': 'Mở không gian AI Chat',
    'chat.aiInsightResult': 'Kết quả AI Insight',
    'chat.runAgain': 'Chạy lại',
    'chat.resendRequest': 'Gửi lại yêu cầu',
    'chat.copyMd': 'Copy MD',
    'chat.copyMdTitle': 'Copy nội dung markdown',
    'chat.exportPdf': 'Export PDF',
    'chat.exportPdfTitle': 'Lưu thành PDF báo cáo',
    'chat.exportHtml': 'Export HTML',
    'chat.exportHtmlTitle': 'Lưu thành file HTML',

    // MCode Chat
    'mcode.errorReadExcel': 'Không thể đọc file Excel. File có thể bị hỏng hoặc có mật khẩu.',
    'mcode.fileTooLarge': '\\n... (bị cắt bớt do quá dài)',
    'mcode.errorReadFile': 'Có lỗi xảy ra khi đọc file.',
    'mcode.askExpertTitle': 'Hỏi chuyên gia Dữ liệu & AI',
    'mcode.title': 'Trợ lý AI',
    'mcode.ready': 'Sẵn sàng hỗ trợ',
    'mcode.dataLoaded': 'Nạp Dữ liệu',
    'mcode.newSessionTitle': 'Bắt đầu phiên chat mới',
    'mcode.newSession': 'Phiên mới',
    'mcode.minimize': 'Thu nhỏ',
    'mcode.maximize': 'Mở rộng',
    'mcode.requireApiKeyDesc': 'Vui lòng cài đặt API Key trong mục Cài đặt (góc trên bên phải) để sử dụng tính năng này.',
    'mcode.assistantTitle': 'Trợ lý AI',
    'mcode.assistantDesc': 'Chuyên gia hỗ trợ Xử lý Dữ liệu, Công thức và Phân tích.',
    'mcode.suggestionsTitle': 'Gợi ý câu hỏi:',
    'mcode.attachFile': 'Đính kèm file (.m, .xlsx, .png, ...)',
    'mcode.attachImage': 'Gửi ảnh báo lỗi (Hoặc paste trực tiếp)',
    'mcode.inputPlaceholder': 'Nhập câu hỏi hoặc paste ảnh lỗi...',
    'mcode.inputDisabled': 'Vui lòng cài đặt API Key trước',
    'mcode.sug1': 'Cách dùng hàm CALCULATE trong DAX?',
    'mcode.sug2': 'Hàm VLOOKUP và XLOOKUP trong Excel?',
    'mcode.sug3': 'Tối ưu Query Folding trong Power Query',
    'mcode.sug4': 'Cách tạo measure tính YTD trong Power BI?',
    'mcode.sug5': 'Sự khác biệt giữa SUM và SUMX?',
    'mcode.sug6': 'Unpivot tên cột lặp lại trong Power Query?',

    // Interactive Charts
    'charts.totalBy': 'Tổng {val} theo {time}',
    'charts.scatterTitle': 'Tương quan Chi tiết (Scatter Plot)',
    'charts.select2Numeric': 'Vui lòng chọn 2 cột số',
    'charts.scatterLimit': 'Liệt kê mẫu tối đa 1000 dòng dữ liệu để tránh quá tải',
    'charts.timeTitle': 'Xu hướng theo Thời gian (Time Series)',
    'charts.timeAxis': 'Thời gian',
    'charts.valueAxis': 'Giá trị',
    'charts.selectDateNum': 'Vui lòng chọn cột Ngày và Số',

    // Markdown
    'markdown.loadingChart': '⏳ Đang tải biểu đồ...',

    'profile.errorAI': 'Có lỗi xảy ra khi phân tích bằng AI.',
    'profile.viewPreview': 'Xem qua dữ liệu mẫu',
    'profile.downloadCleaned': 'Tải dữ liệu đã dọn dẹp (CSV)',
    'profile.searchCol': 'Tìm cột...',
    'profile.type': 'Kiểu dữ liệu',
    'profile.nullStats': 'Dữ liệu trống',
    'profile.uniqueStats': 'Giá trị duy nhất',
    'profile.sample': 'Mẫu',

    // Prompt Studio
    'prompt.studioTitle': 'Tùy chỉnh Prompt',
    'prompt.contextTitle': 'Cung cấp ngữ cảnh Data (Tuỳ chọn)',
    'prompt.contextPlaceholder': 'Ví dụ: Đây là dữ liệu bán lẻ theo tháng, cột Doanh_Thu là VND, mong muốn tìm hiểu lý do sụt giảm tháng 8...',
    'prompt.runAI': 'Phân tích với AI',
    'prompt.processing': 'Đang xử lý...',
    'prompt.requireApi': 'Vui lòng cấu hình API Key trong phần Cài đặt trước khi dùng AI.',
    'prompt.stopGenerate': 'Dừng render',

    // Formula Graph
    'graph.hideStats': 'Ẩn thống kê',
    'graph.showStats': 'Hiện thống kê',
    'graph.processingLayout': 'Đang xử lý layout...',
    'graph.sheetLink': 'Liên kết Sheet',
    'graph.cellLink': 'Liên kết Ô',
    'graph.flows': 'LUỒNG',
    'graph.otherFlows': '+ {count} luồng khác',
    'graph.roles': 'Vai trò Dữ liệu (Roles)',
    'graph.roleSource': '(Dữ liệu gốc)',
    'graph.roleHub': '(Trung chuyển)',
    'graph.roleSink': '(Đích đến)',
    'graph.roleIsolated': '(Không liên kết)',
    'graph.helpClick': '<b>Click</b>: Truy vết Ô / Mở rộng Sheet',
    'graph.helpCtrlClick': '<b>Ctrl+Click</b>: Chọn & Truy vết nhiều Ô',
    'graph.helpDblClick': '<b>Double Click</b>: Gỡ truy vết / Thu gọn Sheet',
    'graph.helpScroll': '<b>Cuộn</b>: Phóng to / Thu nhỏ',
    'graph.helpDrag': '<b>Kéo (Drag)</b>: Di chuyển Graph',
    'graph.searchPlaceholder': 'Tìm sheets, ô (vd. A1), hoặc named ranges...',
    'graph.statsSheets': 'Sheets',
    'graph.statsTotalFormulas': 'Tổng công thức',
    'graph.statsCrossSheet': 'L.Kết Chéo',
    'graph.statsIsolated': 'Độc lập',
    'graph.exportFormulas': 'Xuất Công thức',
    'graph.depTrace': 'Truy vết Phụ thuộc',
    'graph.depth': 'Độ sâu:',
    'graph.noUpstream': 'Không có dòng chảy trên (Upstream).',
    'graph.noDownstream': 'Không có dòng chảy dưới (Downstream).',
    'graph.precedents': 'Dữ liệu Đầu vào (Precedents)',
    'graph.dependents': 'Dữ liệu Đầu ra (Dependents)',
    'graph.value': 'Giá trị:',
    'graph.depthDirect': 'Depth {depth} (Trực tiếp)',
    'graph.depthIndirect': 'Depth {depth} (Gián tiếp)',
};

const viPrompt = {
    'prompt.analysisTitle': '# 📊 Yêu cầu Phân tích Dữ liệu',
    'prompt.metaContext': '## 1. Bối cảnh Dữ liệu (Metadata)',
    'prompt.colDetails': '## 2. Chi tiết các Cột',
    'prompt.numStats': '## Thống kê cột số',
    'prompt.issues': '## Vấn đề phát hiện',
    'prompt.relationships': '## Mối quan hệ giữa các cột',
    'prompt.sampleData': '## Dữ liệu Mẫu',
    'prompt.sampleAnonymized': '> ℹ️ Dưới đây là dữ liệu mẫu đã được anonymize (che dấu thông tin nhạy cảm)',
    'prompt.sampleFull': '> ⚠️ Dữ liệu đầy đủ (Full Mode) — đã bao gồm dữ liệu gốc',
    'prompt.showingRows': '> 📝 Hiển thị',
    'prompt.rowsFirst': 'dòng đầu tiên.',
    'prompt.readiness': '## Khả năng phân tích',
    'prompt.userSpecialReq': '**YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG:**',

    'prompt.metaSourceFile': '- **Tên file nguồn**: ',
    'prompt.metaFormat': '- **Định dạng gốc**: FILE ',
    'prompt.metaFormatNote': ' (Cần nhớ khi viết code load dữ liệu Pandas hay Power Query)',
    'prompt.metaSheets': '- **Số sheet**: ',
    'prompt.metaActiveSheet': ' | Sheet đang phân tích: "',
    'prompt.metaSkipRows': '**Dữ liệu thực tế và Header nằm ở dòng thứ {0}** (Cần skip {1} dòng trước khi Promote Headers)',
    'prompt.metaSkipCols': '**Dữ liệu thực tế bắt đầu từ cột thứ {0}** (Cần xóa bỏ {1} cột rác bên trái)',
    'prompt.metaStructureWarning': '- **🚨 Lưu ý Cấu trúc (Quan trọng cho M-Code)**: Có rác dư thừa ở đầu file.',
    'prompt.metaTotalRows': '- **Tổng số dòng**: ',
    'prompt.metaTotalCols': ' | **Tổng số cột**: ',
    'prompt.metaQualityScore': '- **Điểm chất lượng**: ',
    'prompt.metaTypeDist': '- **Phân bố kiểu dữ liệu**: ',
    'prompt.metaPII': '- **⚠️ Cột nhạy cảm (PII)**: ',

    'prompt.tableHeadersCols1': '| # | Tên Cột | Kiểu | % Null | Unique | Mẫu |',
    'prompt.tableHeadersCols2': '|---|---------|------|--------|--------|------|',
    'prompt.tableSamplesPII': '🔒 [PII]',

    'prompt.tableHeadersStats1': '| Cột | Min | Max | Trung bình | Trung vị | Độ lệch chuẩn |',
    'prompt.tableHeadersStats2': '|-----|-----|-----|------------|----------|----------------|',

    'prompt.sampleNoData': '*Không có dữ liệu mẫu.*',

    'prompt.issueHeader': '### 🚨 Các Vấn đề Chất lượng Tập Trung:',
    'prompt.colIssuesHeader': '### 🐞 Chi tiết Lỗi theo Cột (Dữ liệu thực tế để map M-Code):',
    'prompt.colNameTitle': '- **Cột "{0}"**:\n',
    'prompt.issueError': '  - *Lỗi*:',
    'prompt.issueErrorObf': '  - *Giá trị lỗi (Đã che ẩn danh)*:',
    'prompt.issueErrorRaw': '  - *Giá trị thực tế bị lỗi (Tham khảo)*:',

    'prompt.modePrivacy': '🛡️ Privacy',
    'prompt.modeSample': '📊 Sample',
    'prompt.modeFull': '🔓 Full',

    'prompt.defaultInstructions': `Hãy tiếp nhận mô tả dữ liệu trên và thực hiện theo đúng luồng sau:
1. **Tổng quan Dữ liệu (Descriptive Summary)**: Đưa ra cái nhìn toàn cảnh về tập dữ liệu (quy mô, chất lượng, loại dữ liệu).
2. **Làm sạch Dữ liệu (Data Cleaning)**: Cung cấp M-Code (Power Query) để xử lý dữ liệu lỗi (nếu có).
3. **Phân tích Sâu & Trực quan (Coaching & Visuals)**: Khơi gợi các góc nhìn (Dimensions/Measures). KẾT HỢP BIỂU ĐỒ VÀO TỪNG PHẦN PHÂN TÍCH.
   - ĐỂ BÀI TRÌNH BÀY DỄ ĐỌC, BẤT CỨ KHI NÀO TRÌNH BÀY MỘT GÓC NHÌN HOẶC PHÁT HIỆN, HÃY CHÈN NGAY 1 BIỂU ĐỒ MINH HOẠ BẰNG QUICKCHART API VÀO ĐÓ (Hãy chèn xen kẽ vào từng phần, ĐỪNG dồn hết hình ảnh về cuối bài).
   - Cú pháp BẮT BUỘC: BẠN PHẢI TRẢ VỀ MỘT BLOCK CODE CÓ NGÔN NGỮ LÀ \`quickchart\` CHỨA CẤU HÌNH **STRICT JSON** CỦA BIỂU ĐỒ. HỆ THỐNG SẼ TỰ ĐỘNG VẼ ẢNH TỪ BLOCK CODE NÀY. TUYỆT ĐỐI KHÔNG SỬ DỤNG THẺ HTML \`<img src="..." />\` ĐỂ VẼ CHART.
     Ví dụ:
     \`\`\`quickchart
     {"type":"bar","data":{"labels":["A","B"],"datasets":[{"label":"Data","data":[10,20],"backgroundColor":["rgba(54,162,235,0.7)","rgba(255,99,132,0.7)"]}]}}
     \`\`\`
   - ⚠️ QUAN TRỌNG: Bên trong block \`quickchart\` BẮT BUỘC là STRICT JSON: tất cả key và string phải dùng nháy kép ("), TUYỆT ĐỐI KHÔNG dùng nháy đơn ('), KHÔNG để key không có nháy. Không thêm comment hay trailing comma.
   - LUẬT MÀU SẮC: Tuyệt đối cấm dùng mã Hex (#) do hệ thống QuickChart dễ bị đứt URL, chỉ dùng rgba() hoặc rgb(). Ví dụ: "rgba(54,162,235,0.7)".`,
    'prompt.quickchartReminder': `LƯU Ý: NẾU BÀI PHÂN TÍCH CÓ CÁC CON SỐ CHUYÊN SÂU, HÃY CỐ GẮNG CHÈN CODE BLOCK \`quickchart\` (API QuickChart) VÀO GIỮA ĐỂ TẠO BIỂU ĐỒ BẰNG CÚ PHÁP:
\`\`\`quickchart
{"type":"bar","data":{"labels":["A"],"datasets":[{"label":"X","data":[10],"backgroundColor":"rgba(54,162,235,0.7)"}]}}
\`\`\`
QUAN TRỌNG: Trong block quickchart BẮT BUỘC là STRICT JSON (nháy kép cho key/value, không trailing comma, không comment). Màu sắc dùng rgba()/rgb().`,
    'prompt.mandatoryCommands': `**LỆNH BẮT BUỘC DÀNH CHO BẠN (AI):**
1. KHÔNG hỏi lại "Bạn có cần bổ sung gì...". BẮT ĐẦU LUÔN ngay lập tức.
2. KHÔNG tự bịa ra kết quả kinh doanh vì bạn không có đủ dữ liệu dòng. Hãy hướng dẫn tôi TỰ TÌM RA kết quả đó.
3. M-Code (nếu cần): Phải ở trong block \`\`\`m ... \`\`\`, VIẾT FULL 1 BLOCK DUY NHẤT để Copy-Paste chạy ngay.
4. BẮT BUỘC chèn block code \`quickchart\` XEN KẼ vào giữa các đoạn chữ trong suốt bài phân tích để tôi dễ hình dung, không dồn hình ảnh xuống cuối bài.`
};

// ==========================================
// 🇺🇸 ENGLISH
// ==========================================
const en: Record<keyof typeof vi, string> = {
    // Common
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.error': 'Error',

    // Header / Auth
    'header.hello': 'Hello',
    'header.quota': 'Quota',
    'header.settings': 'Settings',
    'auth.loginGoogle': 'Sign in with Google',
    'auth.loginFailed': 'Login failed. Please try again.',
    'auth.expiresAt': 'Expires: {date} ({days} days left)',
    'auth.expiresUnknown': 'Expires: (Please login again to update)',
    'auth.logout': 'Log Out',
    'auth.requestSuccess': 'Account request sent successfully!',
    'auth.errorOccurred': 'An error occurred.',
    'auth.loginTitle': 'Login to DataLens',
    'auth.requestTitle': 'Request Account Access',
    'auth.loginDesc': 'Sign in with your Google account to continue',
    'auth.requestDesc': 'Enter your Google Email for the Admin to grant access',
    'auth.authenticating': 'Authenticating...',
    'auth.sendRequest': 'Send Request',
    'auth.noAccountSwitch': "Don't have an account? Request access here!",
    'auth.backToLogin Switch': 'Back to Google Login',

    // Settings Modal
    'settings.title': 'System Settings',
    'settings.apiKeyNote': 'Note: Your API Key is saved locally in your browser (Local Storage) and is only sent securely to the Backend during AI interactions.',
    'settings.apiKeyLabel': 'Gemini API Key',
    'settings.apiKeyPlaceholder': 'AIzaSy...',
    'settings.noApiKey': 'Don\'t have an API Key?',
    'settings.getApiKey': 'Get a free API Key at Google AI Studio',
    'settings.chatModel': 'Chat Model (AI)',
    'settings.chatModelNote': 'Used for AI chatbot',
    'settings.insightModel': 'Insight Model',
    'settings.insightModelNote': 'Used for Insights & TMDL Analysis',
    'settings.privacyShield': 'Enable Privacy Shield',
    'settings.privacyShieldNote': 'Automatically obfuscate sensitive data (PII) before upload and analysis',
    'settings.chatFullscreen': 'Floating AI Chatbox in Fullscreen',
    'settings.chatFullscreenNote': 'Show AI assistant toggle even in full-screen mode',
    'settings.systemRole': 'System Role (AI Persona)',
    'settings.saveSuccess': 'Settings saved successfully',
    'settings.language': 'Language (Trực quan)', // keeping language self-explanatory
    'common.scrollToTop': 'Scroll to top',

    // Prompt Studio / Template Gallery
    'prompt.allCategories': 'All',
    'prompt.templateLibrary': 'Template Library',
    'prompt.searchTemplates': 'Search prompt templates...',
    'prompt.noTemplates': 'No prompt templates match your search.',

    // Upload Zone
    'upload.dataAnalysis': '📊 Data Analysis',
    'upload.dataAnalysisDesc': 'Upload data files to view Data Profile, use Prompt Studio, and Chat AI.',
    'upload.dataSupport': 'Supported: .xlsx, .xlsm, .xls, .csv',
    'upload.powerBiModel': '⚡ Power BI Model',
    'upload.powerBiDesc': 'Upload a TMDL folder to analyze and view Semantic Model structures.',
    'upload.powerBiSupport': 'Supported: TMDL Folders',
    'upload.privacyNote': 'Your data is processed locally in your browser and is not stored on our servers.',
    'upload.processing': 'Processing data...',
    'upload.errorFormat': 'Invalid file format. Please upload CSV, Excel, XML, or JSON.',
    'upload.errorRead': 'Failed to read data from the file.',
    'upload.errorLimit': 'File too large. Please select a file under 50MB.',
    'upload.parseOptions': 'Data Parsing Options',
    'upload.headerRowTooltip': 'Row containing headers',
    'upload.startRow': 'Start Row',
    'upload.auto': 'Auto',
    'upload.firstColTooltip': 'First column containing data',
    'upload.startCol': 'Start Column',
    'upload.reading': 'Reading...',
    'upload.applyRead': 'Apply & Reread',
    'upload.tables': 'tables',
    'upload.columns': 'cols',
    'upload.rows': 'rows',
    'upload.sheet': 'Sheet:',

    // Tabs
    'tab.upload': 'Upload',
    'tab.dataProfile': 'Data Profile',
    'tab.formulaGraph': 'Formula Graph',
    'tab.promptStudio': 'Prompt Studio',
    'tab.aiChat': 'AI Assistant',
    'tab.tmdlProfile': 'TMDL Profile',

    // Homepage
    'home.noApiKeyTitle': 'No API Key!',
    'home.noApiKeyDesc': 'You need to enter Gemini API Key to use AI features.',
    'home.openSettings': 'Open Settings',
    'home.footer': 'DataLens v1.0 — Data stays on your browser, insights go everywhere ✨',

    // Profile & Data
    'profile.title': '📊 Data Profile',
    'profile.exportPdf': 'Export PDF',
    'profile.totalRows': 'Total Rows',
    'profile.totalCols': 'Total Columns',
    'profile.piiCols': 'Sensitive (PII)',
    'profile.colDetails': 'Column Details',
    'profile.colName': 'Column Name',
    'profile.colType': 'Data Type',
    'profile.nullRate': 'Null Rate',
    'profile.status': 'Status',
    'profile.unique': 'Unique',
    'profile.dataSample': 'Data Sample',
    'profile.issues': 'Issues',
    'profile.clickToChangeType': 'Click to change type',
    'profile.clickToViewDetails': 'Click to view details',
    'profile.issuesCount': 'issue(s)',
    'profile.typeDistribution': 'Data Type Distribution',
    'profile.missingDataCols': 'Missing Data (Null)',
    'profile.correlationMatrix': 'Correlation Matrix',
    'profile.insightsTitle': 'Insights & Recommendations',
    'profile.recommendation': 'Recommendation:',
    'profile.issueAtCol': 'Issue at Column:',
    'profile.exampleSample': 'Example Sample:',
    'profile.understood': 'Understood',
    'preview.title': 'Data Preview',
    'preview.totalRows': 'total rows',
    'preview.showing': 'Showing',
    'preview.outOf': 'out of',
    'profile.stats': 'Data Columns',
    'profile.quality': 'Quality Score',
    'profile.generateInsights': 'Generate Auto-Insights',
    'profile.generatingInsights': 'Analyzing...',
    'profile.downloadInsights': 'Download Report (Markdown)',
    'profile.autoInsightsDescription': 'Use AI to automatically discover hidden patterns, outliers, and trends in your data.',

    // Prompt Studio
    'prompt.title': '✨ Smart Prompt',
    'prompt.autoDetectDomain': 'Auto-detected Domain:',
    'prompt.privacyMode': 'Only send metadata, keep real data private',
    'prompt.sampleMode': 'Metadata + 5 anonymized sample rows',
    'prompt.fullMode': 'Send full data (Only when safe)',
    'prompt.clearContext': 'Clear context',
    'prompt.quickSuggestions': 'Quick analysis suggestions (1-Click Run):',
    'prompt.customRequest': '🎯 Or enter a custom analysis request:',
    'prompt.customPlaceholder': 'E.g., Analyze monthly sales, find top 10 best-selling products...',
    'prompt.output': 'Prompt Output',
    'prompt.chars': 'chars',
    'prompt.copyPrompt': 'Copy Prompt',
    'prompt.openGemini': 'Open Gemini Web',
    'prompt.needApiKey': 'API Key required',
    'prompt.sendDirect': 'Send directly to Gemini API',
    'prompt.sending': 'Sending...',
    'prompt.sendGemini': 'Send to Gemini & Get insights',

    // AI Chat & Response
    'chat.reportTitle': 'DataLens - AI Analysis Report',
    'chat.analyzing': 'Analyzing data...',
    'chat.quotaError': 'AI system is overloaded or you have exhausted your free quota. Please try again in a few minutes!',
    'chat.networkError': 'Network error. Please check your internet connection and try again.',
    'chat.apiError': 'An unexpected error occurred when connecting to AI. Please try again (Error: API Fault).',
    'chat.oopsError': 'Oops! An error occurred',
    'chat.retry': 'Retry',
    'chat.noReport': 'No Analysis Report Yet',
    'chat.emptyStateDesc': 'You can select a template from Prompt Studio to generate a report, or start chatting directly to deeply analyze {filename}.',
    'chat.openAiChat': 'Open AI Chat Workspace',
    'chat.aiInsightResult': 'AI Insight Result',
    'chat.runAgain': 'Run Again',
    'chat.resendRequest': 'Resend request',
    'chat.copyMd': 'Copy MD',
    'chat.copyMdTitle': 'Copy markdown content',
    'chat.exportPdf': 'Export PDF',
    'chat.exportPdfTitle': 'Save as PDF report',
    'chat.exportHtml': 'Export HTML',
    'chat.exportHtmlTitle': 'Save as HTML file',

    // MCode Chat
    'mcode.errorReadExcel': 'Cannot read Excel file. The file may be corrupted or password protected.',
    'mcode.fileTooLarge': '\\n... (truncated because it is too long)',
    'mcode.errorReadFile': 'An error occurred while reading the file.',
    'mcode.askExpertTitle': 'Ask Data & AI expert',
    'mcode.title': 'AI Assistant',
    'mcode.ready': 'Ready to help',
    'mcode.dataLoaded': 'Data Loaded',
    'mcode.newSessionTitle': 'Start new chat session',
    'mcode.newSession': 'New Session',
    'mcode.minimize': 'Minimize',
    'mcode.maximize': 'Maximize',
    'mcode.requireApiKeyDesc': 'Please set the API Key in Settings (top right) to use this feature.',
    'mcode.assistantTitle': 'AI Assistant',
    'mcode.assistantDesc': 'Data, Formula and Analysis expert.',
    'mcode.suggestionsTitle': 'Suggested questions:',
    'mcode.attachFile': 'Attach file (.m, .xlsx, .png, ...)',
    'mcode.attachImage': 'Send error screenshot (Or paste directly)',
    'mcode.inputPlaceholder': 'Enter your question or paste error screenshot...',
    'mcode.inputDisabled': 'Please set API Key first',
    'mcode.sug1': 'How to use CALCULATE function in DAX?',
    'mcode.sug2': 'VLOOKUP and XLOOKUP functions in Excel?',
    'mcode.sug3': 'Optimize Query Folding in Power Query',
    'mcode.sug4': 'How to create a YTD measure in Power BI?',
    'mcode.sug5': 'Difference between SUM and SUMX?',
    'mcode.sug6': 'Unpivot repeating column names in Power Query?',

    // Interactive Charts
    'charts.totalBy': 'Total {val} by {time}',
    'charts.scatterTitle': 'Detailed Correlation (Scatter Plot)',
    'charts.select2Numeric': 'Please select 2 numeric columns',
    'charts.scatterLimit': 'Sample limited to 1000 rows to prevent overload',
    'charts.timeTitle': 'Time Series Trend',
    'charts.timeAxis': 'Time',
    'charts.valueAxis': 'Value',
    'charts.selectDateNum': 'Please select Date and Numeric columns',

    // Markdown
    'markdown.loadingChart': '⏳ Loading chart...',

    'profile.errorAI': 'An error occurred during AI analysis.',
    'profile.viewPreview': 'Preview Data',
    'profile.downloadCleaned': 'Download Cleaned Data (CSV)',
    'profile.searchCol': 'Search columns...',
    'profile.type': 'Data Type',
    'profile.nullStats': 'Empty Values',
    'profile.uniqueStats': 'Unique Values',
    'profile.sample': 'Sample',

    // Prompt Studio
    'prompt.studioTitle': 'Customize Prompt',
    'prompt.contextTitle': 'Provide Data Context (Optional)',
    'prompt.contextPlaceholder': 'E.g., This is monthly retail data, Revenue is in USD, please find reasons for the August drop...',
    'prompt.runAI': 'Analyze with AI',
    'prompt.processing': 'Processing...',
    'prompt.requireApi': 'Please configure your API Key in Settings before using AI features.',
    'prompt.stopGenerate': 'Stop Generation',

    // Formula Graph
    'graph.hideStats': 'Hide Stats',
    'graph.showStats': 'Show Stats',
    'graph.processingLayout': 'Processing layout...',
    'graph.sheetLink': 'Sheet Link',
    'graph.cellLink': 'Cell Link',
    'graph.flows': 'FLOWS',
    'graph.otherFlows': '+ {count} other flows',
    'graph.roles': 'Data Roles',
    'graph.roleSource': '(Data Source)',
    'graph.roleHub': '(Hub)',
    'graph.roleSink': '(Consumer)',
    'graph.roleIsolated': '(Isolated)',
    'graph.helpClick': '<b>Click</b>: Trace Cell / Expand Sheet',
    'graph.helpCtrlClick': '<b>Ctrl+Click</b>: Select & Trace Multi-Cells',
    'graph.helpDblClick': '<b>Double Click</b>: Untrace / Collapse Sheet',
    'graph.helpScroll': '<b>Scroll</b>: Zoom In / Zoom Out',
    'graph.helpDrag': '<b>Drag</b>: Pan Graph',
    'graph.searchPlaceholder': 'Search sheets, cells (e.g. A1), or named ranges...',
    'graph.statsSheets': 'Sheets',
    'graph.statsTotalFormulas': 'Total Formulas',
    'graph.statsCrossSheet': 'Cross-Sheet Refs',
    'graph.statsIsolated': 'Isolated',
    'graph.exportFormulas': 'Export Formulas',
    'graph.depTrace': 'Dependency Trace',
    'graph.depth': 'Depth:',
    'graph.noUpstream': 'No upstream dependencies.',
    'graph.noDownstream': 'No downstream formulas.',
    'graph.precedents': 'Precedents',
    'graph.dependents': 'Dependents',
    'graph.value': 'Value:',
    'graph.depthDirect': 'Depth {depth} (Direct)',
    'graph.depthIndirect': 'Depth {depth} (Indirect)',
};

const enPrompt: Record<keyof typeof viPrompt, string> = {
    'prompt.analysisTitle': '# 📊 Data Analysis Request',
    'prompt.metaContext': '## 1. Data Metadata Context',
    'prompt.colDetails': '## 2. Column Details',
    'prompt.numStats': '## Numeric Statistics',
    'prompt.issues': '## Discovered Issues',
    'prompt.relationships': '## Column Relationships',
    'prompt.sampleData': '## Sample Data',
    'prompt.sampleAnonymized': '> ℹ️ Below is a sample of anonymized data (sensitive info masked)',
    'prompt.sampleFull': '> ⚠️ Full Data Mode — includes raw original data',
    'prompt.showingRows': '> 📝 Showing first',
    'prompt.rowsFirst': 'rows.',
    'prompt.readiness': '## Analytical Readiness',
    'prompt.userSpecialReq': '**USER SPECIAL REQUEST:**',

    'prompt.metaSourceFile': '- **Source file name**: ',
    'prompt.metaFormat': '- **Original format**: FILE ',
    'prompt.metaFormatNote': ' (Keep this in mind when writing Pandas or Power Query load code)',
    'prompt.metaSheets': '- **Total sheets**: ',
    'prompt.metaActiveSheet': ' | Analyzing sheet: "',
    'prompt.metaSkipRows': '**Actual data and Headers start at row {0}** (Need to skip {1} rows before Promote Headers)',
    'prompt.metaSkipCols': '**Actual data starts at column {0}** (Need to remove {1} garbage columns on the left)',
    'prompt.metaStructureWarning': '- **🚨 Structure Warning (Important for M-Code)**: There is garbage data at the top of the file.',
    'prompt.metaTotalRows': '- **Total rows**: ',
    'prompt.metaTotalCols': ' | **Total columns**: ',
    'prompt.metaQualityScore': '- **Quality score**: ',
    'prompt.metaTypeDist': '- **Data type distribution**: ',
    'prompt.metaPII': '- **⚠️ Sensitive Columns (PII)**: ',

    'prompt.tableHeadersCols1': '| # | Column Name | Type | % Null | Unique | Sample |',
    'prompt.tableHeadersCols2': '|---|-------------|------|--------|--------|--------|',
    'prompt.tableSamplesPII': '🔒 [PII]',

    'prompt.tableHeadersStats1': '| Column | Min | Max | Mean | Median | Std Dev |',
    'prompt.tableHeadersStats2': '|--------|-----|-----|------|--------|---------|',

    'prompt.sampleNoData': '*No sample data available.*',

    'prompt.issueHeader': '### 🚨 Focused Quality Issues:',
    'prompt.colIssuesHeader': '### 🐞 Error Details by Column (Actual data to map M-Code):',
    'prompt.colNameTitle': '- **Column "{0}"**:\n',
    'prompt.issueError': '  - *Error*:',
    'prompt.issueErrorObf': '  - *Error values (Obfuscated)*:',
    'prompt.issueErrorRaw': '  - *Actual error values (For reference)*:',

    'prompt.modePrivacy': '🛡️ Privacy',
    'prompt.modeSample': '📊 Sample',
    'prompt.modeFull': '🔓 Full',

    'prompt.defaultInstructions': `Please review the data context above and follow this exact workflow:
1. **Descriptive Summary**: Provide a high-level overview of the dataset (scale, quality, data types).
2. **Data Cleaning**: Provide M-Code (Power Query) to handle any erroneous data (if applicable).
3. **Deep Analysis & Coaching**: Suggest insights from various Dimensions/Measures. MUST INCLUDE VISUALIZATIONS ALONGSIDE YOUR ANALYSIS.
   - TO MAKE THE REPORT EASIER TO READ, WHENEVER YOU PRESENT AN INSIGHT, EMBED A QUICKCHART API VISUALIZATION DIRECTLY AT THAT POINT (Interleave charts with text, DO NOT push all charts to the end).
   - MANDATORY SYNTAX: YOU MUST RETURN A CODE BLOCK WITH THE LANGUAGE \`quickchart\` CONTAINING **STRICT JSON** CONFIGURATION FOR THE CHART. THE SYSTEM WILL AUTOMATICALLY RENDER THE IMAGE. DO NOT USE HTML \`<img src="..." />\` TAGS TO RENDER CHARTS.
     Example:
     \`\`\`quickchart
     {"type":"bar","data":{"labels":["A","B"],"datasets":[{"label":"Data","data":[10,20],"backgroundColor":["rgba(54,162,235,0.7)","rgba(255,99,132,0.7)"]}]}}
     \`\`\`
   - ⚠️ CRITICAL: Inside the \`quickchart\` block MUST BE STRICT JSON: all keys and strings must use double quotes ("), NEVER use single quotes ('), NO unquoted keys. Do not add comments or trailing commas.
   - COLOR RULE: Hex codes (#) are strictly forbidden as they break the QuickChart URL. Only use rgba() or rgb(). Example: "rgba(54,162,235,0.7)".`,
    'prompt.quickchartReminder': `NOTE: IF YOUR ANALYSIS INCLUDES IN-DEPTH METRICS, YOU MUST EMBED \`quickchart\` (QuickChart API) CODE BLOCKS IN BETWEEN TO CREATE CHARTS USING THIS SYNTAX:
\`\`\`quickchart
{"type":"bar","data":{"labels":["A"],"datasets":[{"label":"X","data":[10],"backgroundColor":"rgba(54,162,235,0.7)"}]}}
\`\`\`
IMPORTANT: The quickchart block MUST be STRICT JSON (double quotes for keys/values, no trailing commas, no comments). Colors must be rgba()/rgb().`,
    'prompt.mandatoryCommands': `**MANDATORY COMMANDS FOR YOU (AI):**
1. DO NOT ask back "Is there anything else you need...". START IMMEDIATELY.
2. DO NOT hallucinate business results because you don't have enough row-level data. Guide me on how to FIND those results myself.
3. M-Code (if applicable): Must be inside a \`\`\`m ... \`\`\` block, WRITTEN AS 1 SINGLE BLOCK for easy Copy-Paste execution.
4. YOU MUST INTERLEAVE \`quickchart\` code blocks between text paragraphs throughout your analysis to help me visualize, do not cluster them all at the end.`
};

export type I18nKey = keyof typeof vi;
export type PromptKey = keyof typeof viPrompt;

export function t(key: I18nKey, lang?: 'vi' | 'en'): string {
    const currentLang = lang || useAppStore.getState().language || 'vi';
    if (currentLang === 'en') {
        return en[key] || vi[key] || key;
    }
    return vi[key] || key;
}

export function tPrompt(key: PromptKey, lang?: 'vi' | 'en'): string {
    const currentLang = lang || useAppStore.getState().language || 'vi';
    if (currentLang === 'en') {
        return enPrompt[key] || viPrompt[key] || key;
    }
    return viPrompt[key] || key;
}
