# Lucky Spin Rewards — React + PHP + MySQL

Đây là bản hosting truyền thống giữ giao diện React của bản chính. PHP chỉ làm API và MySQL lưu dữ liệu.

## Cài trên XAMPP

1. Chép toàn bộ nội dung thư mục `UPLOAD` vào `C:\xampp\htdocs\spin`.
2. Bật Apache và MySQL.
3. Tạo database `lucky_spin` với collation `utf8mb4_unicode_ci`.
4. Mở `http://localhost/spin/install.php`, điền MySQL và tài khoản Admin.
5. Cài xong, kiểm tra trang khách và `/admin/`, sau đó xóa `install.php` và `database.sql`.

## Cài trên Hostinger/cPanel

1. Tạo MySQL Database và ghi lại host, database, username, password.
2. Upload toàn bộ nội dung `UPLOAD` vào `public_html` (hoặc thư mục domain).
3. Mở `https://ten-mien-cua-ban.com/install.php` và điền thông tin database.
4. Đăng nhập Admin tại `/admin/`.
5. Sau khi chạy ổn, xóa `install.php` và `database.sql`. Giữ `config.php`; `config.example.php` có thể xóa.

## Source

- `src/customer`: giao diện vòng quay khách.
- `src/admin`: dashboard Admin.
- `src/api-bridge.ts`: cầu nối React với PHP API.
- `public/api.php`: backend PHP.
- `public/database.sql`: cấu trúc MySQL.
- `UPLOAD`: bản build sẵn để tải thẳng lên hosting.

Muốn sửa giao diện: chạy `npm install`, `npm run dev`. Xuất lại bằng `npm run build`.
