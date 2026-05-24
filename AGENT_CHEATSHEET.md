# 🗺️ Workflow Triggers Cheat Sheet

Quick reference guide for choosing the right agent/workflow.

---

## 🎯 Quick Decision Tree

```
Bạn đang ở đâu trong dự án?
│
├── 🆕 BẮT ĐẦU DỰ ÁN MỚI
│   └── /start-work → @kuro phỏng vấn + lập kế hoạch
│
├── 🤔 CÓ TASK NHƯNG KHÔNG RÕ SCOPE
│   └── @yuki → làm rõ yêu cầu trước
│
├── 📋 CẦN LẬP KẾ HOẠCH CHI TIẾT
│   └── @kuro → strategic planning
│
├── 🔍 REVIEW PLAN TRƯỚC KHI CODE
│   └── @tora → quality gate
│
├── 🔎 CẦN TÌM HIỂU GÌ ĐÓ
│   ├── Trong codebase? → @mochi
│   ├── Bên ngoài (docs/GitHub)? → @neko  
│   ├── Architecture/Debug phức tạp? → @luna
│   └── Hình ảnh/Diagram? → @suki
│
├── 📝 CẦN QUẢN LÝ TASK/TODO
│   └── @hime
│
└── 🛠️ SẴN SÀNG CODE
    ├── Task nhỏ, 1 file? → @chibi
    ├── Task lớn, cần tự chủ? → @boss
    ├── Điều phối nhiều thứ? → @miso
    └── LÀM TẤT CẢ NGAY? → ultrawork
```

---

## 📋 Agent Reference Table

| Agent | Tên đầy đủ | Dùng khi nào | Keyword nhớ |
|-------|-----------|--------------|-------------|
| `@kuro` | **Kuro** (Planner) | Bắt đầu dự án mới, lập kế hoạch chi tiết | **K**ick-off |
| `@yuki` | **Yuki** (Clarifier) | Yêu cầu mơ hồ, cần làm rõ scope | **Y**es/No clarify |
| `@tora` | **Tora** (Critic) | Review plan trước khi thực hiện | **T**est plan |
| `@mochi` | **Mochi** (Scout) | Tìm code trong project | **M**ine (đào bới) |
| `@neko` | **Neko** (Researcher) | Tìm docs/GitHub bên ngoài | **N**et (internet) |
| `@luna` | **Luna** (Consultant) | Debug phức tạp, architecture | **L**unar (nhìn xa) |
| `@suki` | **Suki** (Visual) | Phân tích hình ảnh/diagram | **S**ee (nhìn) |
| `@hime` | **Hime** (Coordinator) | Quản lý todo/task | **H**andler |
| `@chibi` | **Chibi** (Quick) | Task nhỏ, 1 file | **C**hild (nhỏ) |
| `@boss` | **Boss** (Builder) | Task lớn, làm việc tự chủ | **B**ig work |
| `@miso` | **Miso** (Orchestrator) | Điều phối chung | **M**aster |

---

## ⚡ Common Commands

```bash
# Bắt đầu dự án mới
/start-work

# Task lớn - tất cả agent cùng làm
ultrawork
# hoặc
ulw

# Không biết dùng agent nào?
@miso "Tôi cần làm X, dùng agent nào?"
```

---

## 🧠 Memory Tricks (Mẹo nhớ nhanh)

| Agent | Cách nhớ | Giải thích |
|-------|----------|------------|
| **@kuro** | Kuro = Đen → Bóng tối bắt đầu | Bắt đầu dự án mới |
| **@yuki** | Yuki = Tuyết → Làm rõ, trắng đen | Làm rõ yêu cầu |
| **@tora** | Tora = Hổ → Dữ tợn, nghiêm khắc | Review, kiểm tra |
| **@mochi** | Mochi = Bánh → Đào bới, tìm kiếm | Tìm trong codebase |
| **@neko** | Neko = Mèo → Hay ra ngoài | Tìm bên ngoài |
| **@luna** | Luna = Mặt trăng → Nhìn xa trông rộng | Architecture consultant |
| **@suki** | Suki = Thích → Thích nhìn | Phân tích hình ảnh |
| **@hime** | Hime = Công chúa → Quản lý | Quản lý task |
| **@chibi** | Chibi = Nhỏ xíu | Task nhỏ |
| **@boss** | Boss = Sếp | Làm việc lớn |
| **@miso** | Miso = Tương → Vị chính | Orchestrator chính |

---

## 🔄 Workflow Phổ Biến

### 1. Bắt đầu dự án mới
```
/start-work → @kuro phỏng vấn → Tạo plan → @tora review → Bắt đầu code
```

### 2. Task phức tạp không rõ scope
```
@yuki (clarify) → @kuro (plan) → @tora (review) → @miso/@boss (execute)
```

### 3. Debug khó hiểu
```
@luna (consult) → Hiểu vấn đề → @boss (fix)
```

### 4. Tìm hiểu codebase cũ
```
@mochi (tìm pattern) → @luna (giải thích architecture) → Code
```

---

## 💡 Pro Tips

1. **Không nhớ gì hết?** Chỉ cần nhớ 2 cái:
   - `/start-work` - Bắt đầu dự án mới
   - `ultrawork` hoặc `ulw` - Làm tất cả

2. **Không biết dùng agent nào?** → Hỏi `@miso`

3. **Luôn bắt đầu với `/start-work`** khi dự án mới

4. **Task phức tạp?** Theo flow: `@yuki` → `@kuro` → `@tora` → Execute

5. **Debug khó?** → `@luna` trước, đừng đoán mò

---

## 🎮 Cheat Codes (Shortcuts)

| Tình huống | Command |
|-----------|---------|
| Bắt đầu project | `/start-work` |
| Task lớn | `ultrawork` hoặc `ulw` |
| Tìm trong code | `@mochi "tìm auth middleware"` |
| Tìm best practices | `@neko "JWT best practices 2024"` |
| Debug performance | `@luna "tại sao code này chậm?"` |
| Review plan | `@tora` |
| Task nhỏ | `@chibi` |
| Làm tất cả | `ultrawork` |

---

## 📞 Emergency Contacts

| Vấn đề | Agent |
|--------|-------|
| Không biết bắt đầu từ đâu | `/start-work` hoặc `@kuro` |
| Yêu cầu mơ hồ | `@yuki` |
| Cần review plan | `@tora` |
| Tìm code trong project | `@mochi` |
| Tìm docs bên ngoài | `@neko` |
| Debug khó | `@luna` |
| Task nhỏ nhanh | `@chibi` |
| Task lớn tự chủ | `@boss` |
| Điều phối chung | `@miso` |
| Tất cả agent | `ultrawork` |

---

*Lưu ý: Các agent này hoạt động trong OpenCode environment với OhMyOpenCode workflow.*
