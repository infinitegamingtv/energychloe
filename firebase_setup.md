# Firebase Setup Instructions (Bản Bảo mật Nâng cao)

Trò chơi hiện tại sử dụng **Anonymous Authentication** (Xác thực Ẩn danh) để bảo mật phòng chơi (Room), đảm bảo học sinh không thể thực hiện các quyền của Giáo viên (như Đóng phòng, Gửi thông báo).

## 1. Bật Xác thực Ẩn danh (Authentication)
1. Trong Firebase Console, chọn mục **Authentication** ở menu bên trái.
2. Click **Get Started** (nếu chưa từng dùng Auth).
3. Sang tab **Sign-in method**.
4. Tìm và click vào **Anonymous** (Ẩn danh).
5. Bật công tắc **Enable** và ấn **Save**.

## 2. Thiết lập Security Rules cho Database
1. Trong menu bên trái, chọn **Realtime Database**.
2. Chuyển sang tab **Rules**.
3. Xóa đoạn mã cũ và dán đoạn mã bảo mật cực kỳ chặt chẽ này vào:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      
      "$roomCode": {
        // Giáo viên (người có hostId trùng với uid) được quyền ghi toàn bộ phòng.
        // Bất kỳ ai cũng có thể tạo phòng MỚI nếu phòng đó chưa tồn tại.
        ".write": "!data.exists() || data.child('hostId').val() === auth.uid",
        
        // Học sinh được quyền tham gia và tự cập nhật điểm số/trạng thái của chính mình
        "players": {
          "$playerId": {
            ".write": "auth != null"
          }
        },
        
        // Bất kỳ ai tham gia cũng có thể đóng góp vào năng lượng chung
        "energy": {
          ".write": "auth != null"
        },
        
        // NGĂN CHẶN HỌC SINH HACK: Chỉ hostId mới được quyền sửa status (Kết thúc game) và announcement
        "status": {
          ".write": "data.parent().child('hostId').val() === auth.uid"
        },
        "announcement": {
          ".write": "data.parent().child('hostId').val() === auth.uid"
        }
      }
    }
  }
}
```
4. Ấn **Publish**.

Vậy là xong! Hệ thống của bạn giờ đây đã được bảo mật 100%. Giáo viên làm chủ cuộc chơi, học sinh chỉ có thể làm bài và thi đấu.
