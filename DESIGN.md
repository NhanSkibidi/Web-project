---
name: KS25 Library Design System
description: Ngôn ngữ thiết kế thư viện số KS25 - Đậm chất học thuật, ấm áp và chính xác
colors:
  primary: "#1B4332"
  primary-hover: "#2D6A4F"
  background: "#FAF8F5"
  surface: "#FFFFFF"
  border: "#E6E2D8"
  accent-warning: "#B45309"
  accent-danger: "#991B1B"
  accent-success: "#15803D"
  text-primary: "#1A202C"
  text-secondary: "#4A5568"
  text-muted: "#718096"
typography:
  display:
    fontFamily: "'Newsreader', Georgia, serif"
    fontWeight: 600
    lineHeight: 1.2
  headline:
    fontFamily: "'Newsreader', Georgia, serif"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Newsreader', Georgia, serif"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    fontWeight: 500
icons: Lucide
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview
Hệ thống thiết kế thư viện số **KS25 Library System** mang phong cách giao thoa giữa không gian học thuật cổ điển và giao diện kỹ thuật số hiện đại. Thiết kế tạo cảm giác ấm áp như những trang sách giấy, nhưng cực kỳ sắc nét, mạch lạc và tối ưu cho việc quét mã, nhập liệu tốc độ cao tại quầy thủ thư và tra cứu của độc giả.

## Colors
Bảng màu lấy cảm hứng từ không gian thư viện truyền thống: giấy in cao cấp, bìa sách xanh rừng thẫm và gỗ sồi:

- **Màu nền (Background):** `#FAF8F5` (Nền giấy ấm - Warm Paper) giúp bảo vệ thị lực, giảm chói mắt khi đọc lâu so với màu trắng tinh `#FFFFFF`.
- **Màu thẻ (Surface / Card):** `#FFFFFF` (Thẻ trắng tinh khiết) tạo sự tương phản nhẹ nhàng trên nền giấy ấm.
- **Màu đường viền (Border):** `#E6E2D8` (Viền xám cát ấm) phân tách nhẹ nhàng các khối nội dung, không gắt.
- **Màu chủ đạo (Primary):** `#1B4332` (Xanh rừng đậm - Deep Forest Green) đại diện cho tri thức, sự điềm đạm, uy tín và chuyên nghiệp của thư viện trường học.
- **Màu tương tác hover:** `#2D6A4F` (Xanh rừng tươi hơn một bậc khi hover hoặc active nút).
- **Màu nhấn cảnh báo (Warning Accent):** `#B45309` (Hổ phách đậm - Deep Amber) dùng cho các cảnh báo quá hạn mượn sách, phạt tiền chưa nộp, hoặc sách hư hại.
- **Màu văn bản chính (Text Primary):** `#1A202C` (Xám đen than củi) mang lại độ tương phản chuẩn WCAG AAA trên cả nền giấy ấm và nền trắng.
- **Màu văn bản phụ (Text Muted):** `#718096` cho metadata, nhãn phụ và thời gian.

## Typography
Phân cấp phông chữ tuân thủ nguyên tắc 3 vai trò rõ rệt:

1. **Font Tiêu đề (Headings):** `'Newsreader', Georgia, serif`
   - Dùng cho `h1`, `h2`, `h3`, tên sách, tên danh mục chính.
   - Mang phong thái của các tạp chí học thuật và bìa sách kinh điển.
2. **Font Nội dung & Giao diện (Body & Interface):** `'Plus Jakarta Sans', -apple-system, sans-serif`
   - Dùng cho đoạn văn mô tả, form nhập liệu, nhãn nút bấm, bảng dữ liệu.
   - Cực kỳ thoáng mắt, nét chữ hình học hiện đại, độ dễ đọc (legibility) tối ưu trên mọi màn hình.
3. **Font Mã số & Kỹ thuật (Code & Monospace):** `'JetBrains Mono', monospace`
   - Dùng riêng cho các trường mã dữ liệu: `ISBN`, mã bản sao `copy_code`, mã thẻ `card_code`, mã vạch `barcode`, số tiền phạt `amount`.
   - Giúp thủ thư và độc giả không bị nhầm lẫn giữa ký tự số `0` và chữ `O`, số `1` và chữ `l`.

## Layout
- **Hệ thống Grid:** Sử dụng CSS Grid và Flexbox với khoảng cách tiêu chuẩn 8px / 16px / 24px.
- **Độ rộng khung chứa (Container):**
  - Tối đa `1100px` căn giữa cho các trang nội dung thông thường.
  - Tối đa `1400px` cho Dashboard quản trị của Thủ thư.
- **Cấu trúc 2 cột linh hoạt (`layout-2col`):**
  - Cột phụ bên trái (`320px` - `360px`): Dành cho bộ lọc tìm kiếm, thông tin thẻ độc giả, hoặc form thao tác nhanh.
  - Cột chính bên phải (còn lại): Danh sách kết quả sách, bảng phiếu mượn/trả.
  - Tự động co về 1 cột trên màn hình điện thoại / máy tính bảng (< `800px`).

## Elevation & Depth
- **Phong cách đổ bóng:** Tối giản, không lạm dụng bóng mờ đậm.
- **Đổ bóng thẻ (Card Shadow):** `0 1px 3px rgba(27, 67, 50, 0.05), 0 1px 2px rgba(27, 67, 50, 0.03)`.
- **Đổ bóng khi nổi bật (Elevated / Modal):** `0 10px 15px -3px rgba(27, 67, 50, 0.08), 0 4px 6px -2px rgba(27, 67, 50, 0.04)`.
- **Lớp phủ nền (Backdrop):** Mờ nhẹ khi mở dialog/modal: `rgba(26, 32, 44, 0.4)`.

## Shapes
- **Bán kính bo góc (Border Radius):**
  - Nút bấm, ô nhập liệu (`input`, `select`), nhãn tag (`badge`): `6px` - `8px`.
  - Khung thẻ (`.card`), bảng dữ liệu (`table`), modal: `10px` - `12px`.
  - Giữ phom dáng thanh lịch, cứng cáp vừa phải, không bo tròn dạng viên thuốc (pill) để duy trì chất học thuật.

## Components

### 1. Nút bấm (Buttons)
- **Primary Button:** Nền `#1B4332`, chữ trắng `#FFFFFF`, bo góc `8px`, font `Plus Jakarta Sans` trọng số 600. Khi hover đổi thành `#2D6A4F`.
- **Secondary / Outline Button:** Nền trong suốt hoặc `#FAF8F5`, viền `1px solid #1B4332`, chữ `#1B4332`.
- **Warning / Action Button:** Nền `#B45309`, chữ trắng cho các thao tác phạt tiền hoặc hủy mượn.

### 2. Thẻ hiển thị (Cards)
- Nền trắng tinh `#FFFFFF`, viền mỏng `1px solid #E6E2D8`, bo góc `10px`.
- Padding chuẩn: `20px` đến `24px`.

### 3. Huy hiệu trạng thái (Badges / Tags)
- **AVAILABLE (Sẵn sàng):** Nền `#ECFDF5`, chữ `#15803D`, viền `#A7F3D0`.
- **BORROWED (Đang mượn):** Nền `#EFF6FF`, chữ `#1D4ED8`, viền `#BFDBFE`.
- **RESERVED (Đang giữ chỗ):** Nền `#FFFBEB`, chữ `#B45309`, viền `#FDE68A`.
- **LOST / DAMAGED (Mất / Hỏng):** Nền `#FEF2F2`, chữ `#991B1B`, viền `#FECACA`.

### 4. Biểu tượng (Icons)
- Sử dụng bộ icon **Lucide** (nét vẽ mảnh 1.75px - 2px, kích thước 18px - 20px) đem lại vẻ tinh gọn, chính xác.

## Do's and Don'ts

### Do's:
- Luôn hiển thị mã `copy_code`, `ISBN`, `card_code` bằng font `JetBrains Mono`.
- Dùng màu xanh rừng đậm `#1B4332` làm màu nhận diện chủ đạo cho Header, nút chính và trạng thái Active.
- Dùng màu hổ phách `#B45309` để báo hiệu các khoản phạt, quá hạn hoặc thông báo cần lưu ý.
- Sử dụng viền `#E6E2D8` trên nền `#FAF8F5` để duy trì sự dịu mắt và vẻ sang trọng.

### Don'ts:
- Không dùng màu xanh dương mặc định `#2563eb` của Tailwind/Bootstrap.
- Không dùng nền trắng toát toàn trang `#FFFFFF` làm nền chính của `body`.
- Không phối quá nhiều màu rực rỡ, phá vỡ bầu không khí trang nhã, nghiêm túc của thư viện.
- Không dùng font Serif cho phần thân bảng hoặc danh sách mã số kỹ thuật.

