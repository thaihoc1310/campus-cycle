# Xác định bài toán

1. ## Vấn đề hiện tại

   1. **Vòng đời sản phẩm ngắn:** Trong môi trường trường tư thục, học sinh thường có điều kiện thay đổi đồ dùng (đồng phục, sách giáo khoa, thiết bị điện tử, dụng cụ học tập) rất nhanh theo từng năm học hoặc kỳ học.  
   2. **Tồn dư tài nguyên:** Lượng đồ dùng còn tốt nhưng không còn nhu cầu sử dụng bị bỏ trống tại nhà hoặc vứt bỏ, gây lãng phí lớn về mặt kinh tế và môi trường.  
   3. **Hoạt động thiện nguyện rời rạc:** Việc quyên góp đồ cũ hiện nay thường chỉ diễn ra theo đợt phát động lớn của nhà trường, chưa có một nơi để kết nối người cho và người cần một cách liên tục.  
   4. **Nhu cầu mua sắm nội bộ:** Có một bộ phận không nhỏ học sinh hoặc cán bộ nhân viên có nhu cầu mua lại đồ cũ (như sách hiếm, đồ dùng CLB) để tiết kiệm chi phí nhưng không biết tìm ở đâu trong phạm vi trường.  
   5. **Quản lý chiến dịch gây quỹ và quyên góp còn thủ công:** Các chiến dịch thiện nguyện, gây quỹ hoặc quyên góp vật phẩm thường được quản lý thủ công bằng bảng tính, biểu mẫu hoặc tin nhắn. Khiến việc thống kê số tiền nhận được, số lượng vật phẩm quyên góp, trạng thái giao nhận và báo cáo tổng kết mất nhiều thời gian, dễ sai sót

2. ## Khó khăn thực tế

   1. **Thiếu sự tin cậy trên nền tảng mở:** Nếu dùng Facebook hay Zalo, việc giao dịch với người lạ tiềm ẩn rủi ro về an toàn thông tin và chất lượng hàng hóa. Không có cơ chế xác thực thành viên là người trong trường.  
   2. **Tin nhắn bị trôi và thiếu phân loại:** Các hội nhóm mạng xã hội khiến thông tin bị loãng. Người dùng khó tìm kiếm món đồ mình cần theo danh mục.  
   3. **Quy trình kiểm soát nội dung:** Các bài đăng sản phẩm hoặc chiến dịch nếu không được kiểm duyệt có thể chứa thông tin sai lệch, hình ảnh kém chất lượng, nội dung không phù hợp với môi trường sư phạm hoặc sản phẩm không được phép đăng bán

3. ## Tại sao cần hệ thống này

   1. **Xây dựng mạng lưới nội bộ:** Hệ thống dành cho học sinh/giáo viên, tạo ra sự an tâm tuyệt đối và dễ dàng bàn giao đồ trực tiếp tại khuôn viên trường.  
   2. **Chuẩn hóa hóa quy trình duyệt bài:** Thành viên có thể tạo bài đăng sản phẩm, sau đó bài đăng được quản trị viên kiểm duyệt trước khi hiển thị công khai. Quy trình này giúp đảm bảo nội dung phù hợp, sản phẩm rõ ràng và tránh các bài đăng không đạt tiêu chuẩn.  
   3. **Quản lý chiến dịch gây quỹ và quyên góp tập trung:** Quản trị viên của tổ chức có thể tạo chiến dịch. Thành viên có thể xem danh sách chiến dịch, xem chi tiết, quyên góp tiền, quyên góp vật phẩm hoặc bán vật phẩm và trích một phần giá trị để đóng góp cho chiến dịch.  
   4. **Tự động hóa dòng tiền gây quỹ:** Mỗi giao dịch phát sinh phí trung gian sẽ được hệ thống tự động ghi nhận và chuyển vào quỹ chung. Quản trị viên có thể tìm kiếm, xem chi tiết giao dịch và xuất báo cáo quỹ chung, giúp việc quản lý tài chính nên minh và rõ ràng.  
   5. **Tăng hiệu suất thiện nguyện:** Hệ thống giúp kết nối người có vật phẩm dư thừa với các chiến dịch cần quyên góp. Thay vì chỉ tổ chức các đợt thiện nguyện ngắn hạn, nhà trường hoặc tổ chức có thể duy trì hoạt động quyên góp thường xuyên, dễ quản lý và dễ thống kê hơn.  
   6. **Hỗ trợ thanh toán trung gian an toàn:** Hệ thống đóng vai trò trung gian trong giao dịch. Người mua thanh toán vào hệ thống trước, sau khi nhận được hàng từ người bán thì hệ thống mới chuyển tiền cho người bán. Cơ chế này giúp bảo vệ người mua, giảm tranh chấp và tăng độ tin cậy trong quá trình giao dịch.

# Yêu cầu chức năng

## 1\. Quản trị viên (Administrator)

### 1.1 Quản lý thành viên

* Thêm, sửa, xóa thành viên

### 1.2 Quản lý tổ chức

* Thêm, sửa, xóa tổ chức  
* Thêm các thành viên làm quản trị viên tổ chức

### 1.3 Quản lý sản phẩm

* Thêm, sửa, xóa sản phẩm  
* Kiểm duyệt sản phẩm

### 1.4 Quản lý chiến dịch

* Thêm, sửa, xóa chiến dịch  
* Kiểm duyệt chiến dịch

### 1.5 Quản lý giao dịch

* Tìm kiếm và xem chi tiết các giao dịch  
* Xuất báo cáo quỹ chung

## 2\. Thành viên (Member)

### 2.1 Quản lý tài khoản

* Đăng ký tài khoản  
* Đăng nhập hệ thống  
* Đăng xuất hệ thống  
* Cập nhật thông tin cá nhân  
* Đổi mật khẩu

### 2.2 Quản lý bài đăng sản phẩm

* Tạo bài đăng  
  * Thêm tên, thông tin, thể loại của sản phẩm  
  * Tải lên các ảnh của sản phẩm  
* Chỉnh sửa, Xóa, Xem trạng thái bài đăng

### 2.3 Tham gia chiến dịch

* Xem danh sách chiến dịch  
* Xem chi tiết chiến dịch  
* Quyên góp tiền với những chiến dịch gây quỹ  
  * Quyên góp trực tiếp tiền  
  * Bán vật phẩm và quyên góp 1 phần giá trị  
* Quyên góp vật phẩm với những chiến dịch quyên góp  
  * Gửi vật phẩm quyên góp cho chiến dịch  
  * Theo dõi trạng thái vật phẩm quyên góp

### 2.4 Tìm kiếm và mua sản phẩm

* Xem danh sách sản phẩm  
* Tìm kiếm sản phẩm  
* Xem chi tiết sản phẩm  
* Gửi yêu cầu mua sản phẩm

## 3\. Quản trị viên tổ chức (Organization Admin)

### 3.1 Quản lý chiến dịch

* Tạo chiến dịch  
  * Nhập tên, thông tin, end date, start date chiến dịch  
  * Thêm các ảnh của chiến dịch

### 3.2 Kiểm duyệt các sản phẩm tham gia vào chiến dịch

### 3.3 Báo cáo chiến dịch

* Xem báo cáo số tiền nhận được từ gây quỹ  
* Xem thống kê vật phẩm quyên góp

## 4\. Hệ thống thanh toán (Billing System)

* Gửi thông tin hóa đơn và kết quả thanh toán

# Yêu cầu phi chức năng

## 1\. Hiệu năng

* Hệ thống phải phản hồi các thao tác thông thường trong vòng dưới 3 giây.  
* Chức năng tìm kiếm sản phẩm phải trả kết quả dưới 3 giây.  
* Hệ thống phải hỗ trợ tối thiểu 500 người dùng truy cập đồng thời.

## 2\. Bảo mật

* Người dùng phải đăng nhập bằng tài khoản và mật khẩu trước khi sử dụng hệ thống.  
* Mật khẩu phải được mã hóa trước khi lưu vào cơ sở dữ liệu.  
* Chỉ quản trị viên mới được phép duyệt bài đăng và chiến dịch.

## 3\. Tính sẵn sàng

* Hệ thống phải hoạt động tối thiểu 99% thời gian.  
* Dữ liệu phải được sao lưu tối thiểu 1 lần mỗi ngày.  
* Hệ thống phải khôi phục dữ liệu trong vòng tối đa 2 giờ khi xảy ra sự cố.

## 4\. Giao diện và khả năng sử dụng

* Người dùng mới có thể sử dụng các chức năng cơ bản mà không cần hướng dẫn.  
* Các nút chức năng chính như đăng nhập, đăng bài, quyên góp, mua sản phẩm phải dễ tìm.  
* Hệ thống phải hiển thị thông báo rõ ràng khi thao tác thành công hoặc thất bại.

## 5\. Khả năng mở rộng

* Hệ thống phải hỗ trợ tối thiểu 10.000 bài đăng sản phẩm.  
* Hệ thống có thể mở rộng thêm nhiều trường học mà không cần thay đổi kiến trúc chính.

## 6\. Tính toàn vẹn dữ liệu

* Thông tin giao dịch và thanh toán phải được lưu chính xác 100%.  
* Hệ thống phải lưu lịch sử giao dịch tối thiểu 5 năm.  
* Không cho phép mất dữ liệu khi hệ thống gặp lỗi thông thường.

## 7\. Khả năng bảo trì

* Hệ thống phải cho phép cập nhật hoặc sửa lỗi mà không làm mất dữ liệu.  
* Thời gian bảo trì hệ thống không vượt quá 2 giờ mỗi lần bảo trì. 

# Giới hạn và các phần nằm ngoài hệ thống

Để tối ưu hóa quy trình vận hành và tập trung vào tính năng cốt lõi, hệ thống sẽ không tham gia vào các công đoạn sau:

* **Xử lý thanh toán trực tiếp:** Hệ thống không trực tiếp xử lý giao dịch tài chính, lưu trữ thông tin thẻ ngân hàng hoặc thực hiện đối soát thanh toán. Khi người dùng thực hiện thanh toán, hệ thống chỉ gửi thông tin giao dịch sang Billing System. Billing System sẽ tiếp tục làm việc với cổng thanh toán trung gian để tạo mã QR thanh toán và trả kết quả về cho hệ thống hiển thị tới người dùng.  
* **Dịch vụ vận chuyển và giao nhận:** Hệ thống không cung cấp giải pháp ship hàng hay tích hợp với các đơn vị vận chuyển bên thứ ba. Việc bàn giao sản phẩm được mặc định là giao dịch trực tiếp trong khuôn viên trường hoặc theo thỏa thuận riêng của hai bên.  
* **Kiểm định chất lượng sản phẩm thực tế:** Hệ thống chỉ quản lý về mặt thông tin và hình ảnh được đăng tải. Việc xác nhận chất lượng thực tế của món đồ so với mô tả sẽ do người mua tự đánh giá khi tiếp nhận sản phẩm.

