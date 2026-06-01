# Campus Cycle

Campus Cycle là nền tảng nội bộ cho trường học, hỗ trợ trao đổi, thanh lý, mua bán và quyên góp các vật phẩm còn giá trị sử dụng. Hệ thống hướng tới giảm lãng phí tài nguyên trong môi trường học đường, tăng tính minh bạch cho các chiến dịch quyên góp/gây quỹ và tạo một kênh giao dịch an toàn giữa các thành viên đã xác thực.

Tài liệu thiết kế chính của dự án nằm trong [requirement/sdd.pdf](requirement/sdd.pdf). Các sơ đồ ngữ cảnh, DFD, ERD và relational diagram được lưu trong thư mục [requirement/](requirement/).

## Mục tiêu hệ thống

- Tạo môi trường trao đổi, mua bán và thanh lý đồ cũ trong phạm vi nội bộ trường học.
- Hỗ trợ tổ chức, quản lý và theo dõi các chiến dịch quyên góp/gây quỹ.
- Chuẩn hóa quy trình kiểm duyệt bài đăng sản phẩm và chiến dịch trước khi công khai.
- Quản lý giao dịch, trạng thái bàn giao và lịch sử đóng góp một cách tập trung.
- Cung cấp dashboard và báo cáo cho quản trị viên hệ thống và quản trị viên tổ chức.

## Phạm vi

Trong phạm vi hệ thống:

- Quản lý tài khoản, phân quyền và trạng thái kích hoạt người dùng.
- Đăng, sửa, tìm kiếm và quản lý vật phẩm bán hoặc quyên góp.
- Kiểm duyệt vật phẩm, danh mục, tổ chức và chiến dịch.
- Quản lý tổ chức/câu lạc bộ và phân công Organization Admin.
- Xử lý yêu cầu mua hàng, quyên góp tiền và quyên góp vật phẩm cho chiến dịch.
- Theo dõi trạng thái giao dịch, trạng thái vật phẩm quyên góp và thống kê dashboard.
- Lưu trữ ảnh upload cho người dùng, tổ chức, vật phẩm và chiến dịch.

Ngoài phạm vi hiện tại:

- Không trực tiếp xử lý thanh toán thật hoặc lưu thông tin ngân hàng.
- Không cung cấp vận chuyển/giao nhận.
- Không kiểm định chất lượng thực tế của vật phẩm.
- Không giải quyết tranh chấp phát sinh ngoài hệ thống.

Ghi chú: SDD mô tả một Billing System bên ngoài. Trong implementation hiện tại, luồng thanh toán được mô phỏng bằng trạng thái giao dịch như `pending`, `paid`, `completed`, `cancelled`.

## Vai trò người dùng

| Vai trò | Mô tả |
| --- | --- |
| Member | Học sinh, giáo viên hoặc nhân sự trong trường. Có thể đăng vật phẩm, mua hàng, quyên góp tiền/vật phẩm, theo dõi giao dịch và cập nhật hồ sơ cá nhân. |
| Administrator | Quản trị viên hệ thống. Quản lý người dùng, tổ chức, danh mục, vật phẩm, chiến dịch, giao dịch và dashboard tổng quan. |
| Organization Admin | Quản trị viên của tổ chức/câu lạc bộ. Quản lý thông tin tổ chức, tạo chiến dịch, theo dõi đóng góp và cập nhật trạng thái bàn giao vật phẩm quyên góp. |
| Billing System | Tác nhân ngoài theo SDD, đại diện cho cổng thanh toán trung gian. Bản hiện tại mô phỏng kết quả thanh toán trong hệ thống. |

## Luồng nghiệp vụ chính

1. Member đăng vật phẩm bán hoặc vật phẩm quyên góp.
2. Hệ thống lưu vật phẩm ở trạng thái chờ duyệt.
3. Administrator kiểm duyệt vật phẩm hoặc chiến dịch.
4. Member mua vật phẩm, thanh toán mô phỏng và xác nhận nhận hàng.
5. Member quyên góp tiền hoặc gửi vật phẩm vào chiến dịch đang hoạt động.
6. Organization Admin xét duyệt vật phẩm quyên góp, cập nhật trạng thái bàn giao và xác nhận đã nhận.
7. Dashboard tổng hợp số liệu người dùng, vật phẩm, chiến dịch, giao dịch, doanh thu và đóng góp.

Các tiến trình được mô tả trong SDD gồm: quản lý bài đăng vật phẩm, quản lý chiến dịch, kiểm duyệt vật phẩm/chiến dịch, gửi vật phẩm vào chiến dịch, xử lý mua hàng, chuẩn bị thông tin thanh toán, quản lý trạng thái vật phẩm quyên góp, quản lý giao dịch, dashboard/report và quản lý tổ chức.

## Chức năng chính

### Member

- Đăng nhập, đăng ký, cập nhật hồ sơ và avatar.
- Xem trang chủ, marketplace, chi tiết vật phẩm và danh sách chiến dịch.
- Đăng vật phẩm bán hoặc vật phẩm quyên góp kèm ảnh.
- Quản lý vật phẩm đã đăng và theo dõi trạng thái kiểm duyệt.
- Tạo giao dịch mua, thanh toán mô phỏng, xác nhận nhận hàng hoặc từ chối bàn giao.
- Quyên góp tiền cho chiến dịch gây quỹ.
- Quyên góp vật phẩm cho chiến dịch nhận hiện vật.

### Administrator

- Xem dashboard tổng quan.
- Quản lý người dùng, bao gồm vai trò và trạng thái kích hoạt.
- Quản lý tổ chức và gán Organization Admin.
- Quản lý danh mục vật phẩm.
- Kiểm duyệt và quản lý vật phẩm, chiến dịch, ảnh và trạng thái.
- Theo dõi danh sách giao dịch.

### Organization Admin

- Xem dashboard theo tổ chức.
- Cập nhật thông tin và ảnh đại diện tổ chức.
- Tạo, sửa, xóa và quản lý chiến dịch của tổ chức.
- Theo dõi vật phẩm quyên góp và donor.
- Chuyển trạng thái vật phẩm quyên góp: `pending`, `handover`, `received`, `rejected`.

## Thiết kế hệ thống

### Kiến trúc

```text
frontend/            React + Vite UI
    |
    | HTTP /api, /uploads
    v
backend/             FastAPI REST API
    |
    | SQLAlchemy ORM + Alembic
    v
postgres             PostgreSQL 16
```

Backend phục vụ REST API tại `/api/*` và static uploads tại `/uploads/*`. Frontend dùng Vite proxy để chuyển `/api` và `/uploads` sang backend local.

### Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, Recharts, lucide-react |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Database | PostgreSQL 16 |
| Auth | JWT, bcrypt/passlib |
| Upload | Local file storage trong `backend/uploads` |
| Dev infra | Docker Compose cho PostgreSQL |

### Mô hình dữ liệu

Các bảng chính:

- `users`: tài khoản, vai trò, trạng thái kích hoạt và thông tin hồ sơ.
- `organizations`: tổ chức/câu lạc bộ/đơn vị trong trường.
- `organization_admins`: liên kết người dùng với tổ chức mà họ quản trị.
- `categories`: danh mục vật phẩm được phép đăng.
- `items`: vật phẩm bán hoặc quyên góp.
- `item_images`: ảnh vật phẩm.
- `campaigns`: chiến dịch gây quỹ hoặc nhận quyên góp hiện vật.
- `campaign_images`: ảnh chiến dịch.
- `campaign_items`: vật phẩm được gửi vào chiến dịch và trạng thái bàn giao.
- `transactions`: giao dịch mua bán hoặc quyên góp tiền cho chiến dịch.

### Tài liệu và sơ đồ

- SDD: [requirement/sdd.pdf](requirement/sdd.pdf)
- Context Diagram: [requirement/context.drawio.png](requirement/context.drawio.png)
- DFD Level 0: [requirement/dfd0.drawio.png](requirement/dfd0.drawio.png)
- ER Diagram: [requirement/er.drawio.png](requirement/er.drawio.png)
- Relational Diagram: [requirement/rd.drawio.png](requirement/rd.drawio.png)

## Cấu trúc thư mục

```text
campus-cycle/
|-- backend/
|   |-- app/
|   |   |-- models/       # SQLAlchemy models
|   |   |-- routers/      # FastAPI routers
|   |   |-- schemas/      # Pydantic schemas
|   |   |-- services/     # auth, upload helpers
|   |   |-- config.py
|   |   |-- database.py
|   |   |-- main.py
|   |   `-- seed.py
|   |-- alembic/          # database migrations
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- context/
|   |   `-- pages/
|   |-- package.json
|   `-- vite.config.js
|-- requirement/
|-- docker-compose.yml
`-- README.md
```

## Yêu cầu môi trường

- Python 3.11+
- Node.js 20+ và pnpm
- Docker / Docker Compose
- PostgreSQL client libraries nếu chạy backend trực tiếp trên máy

## Cài đặt và chạy

### 1. Chạy PostgreSQL

```bash
docker compose up -d postgres
```

Thông tin database mặc định:

| Trường | Giá trị |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `campus_cycle` |
| User | `campus_user` |
| Password | `campus_pass_2024` |

Nếu không dùng Docker, tạo database thủ công:

```sql
CREATE USER campus_user WITH PASSWORD 'campus_pass_2024';
CREATE DATABASE campus_cycle OWNER campus_user;
GRANT ALL PRIVILEGES ON DATABASE campus_cycle TO campus_user;
```

### 2. Chạy backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. python -m app.seed
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend chạy tại:

- API: `http://localhost:8000`
- Swagger/OpenAPI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`
- Uploads: `http://localhost:8000/uploads/...`

Lưu ý: `python -m app.seed` chỉ chạy khi database chưa có user. Nếu database đã có dữ liệu, script sẽ dừng để tránh ghi đè dữ liệu demo.

Tùy chọn tải ảnh demo từ Openverse:

```bash
cd backend
source venv/bin/activate
PYTHONPATH=. python -m app.seed_images
```

### 3. Chạy frontend

Mở terminal khác:

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Vite proxy đã cấu hình:

- `/api` -> `http://localhost:8000`
- `/uploads` -> `http://localhost:8000`

## Tài khoản demo

Sau khi chạy seed:

| Vai trò | Email | Password | Ghi chú |
| --- | --- | --- | --- |
| Admin | `admin@campus-cycle.com` | `admin123` | Truy cập `/admin` |
| Member / Org Admin | `maya.green@campus.edu` | `demo123` | Quản lý Green Campus Club |
| Member / Org Admin | `noah.park@campus.edu` | `demo123` | Quản lý Green Campus Club |
| Member / Org Admin | `liam.carter@campus.edu` | `demo123` | Quản lý Student Support Union |
| Member | `alice.nguyen@campus.edu` | `demo123` | Tài khoản demo thường |

Người dùng đăng ký mới có trạng thái `inactive`. Admin cần kích hoạt tài khoản trong trang quản lý người dùng trước khi tài khoản đó có thể đăng vật phẩm, mua hàng hoặc quyên góp.

## API chính

| Nhóm API | Prefix | Mục đích |
| --- | --- | --- |
| Auth | `/api/auth` | Đăng ký, đăng nhập, thông tin cá nhân, đổi mật khẩu, avatar |
| Client | `/api/client` | Marketplace, vật phẩm cá nhân, chiến dịch, giao dịch, thông báo |
| Admin Users | `/api/users` | Quản lý người dùng |
| Admin Organizations | `/api/organizations` | Quản lý tổ chức và org admins |
| Admin Categories | `/api/categories` | Quản lý danh mục |
| Admin Items | `/api/items` | Quản lý/kiểm duyệt vật phẩm và ảnh |
| Admin Campaigns | `/api/campaigns` | Quản lý/kiểm duyệt chiến dịch và ảnh |
| Admin Transactions | `/api/transactions` | Theo dõi giao dịch |
| Admin Dashboard | `/api/dashboard` | Thống kê tổng quan |
| Organization Workspace | `/api/org` | Dashboard, campaign và donation workflow của tổ chức |

## Trạng thái quan trọng

| Đối tượng | Trạng thái |
| --- | --- |
| User | `active`, `inactive` |
| Item | `pending`, `approved`, `rejected`, `reserved`, `sold`, `donated` |
| Campaign | `pending`, `approved`, `rejected`, `completed` |
| Campaign Item | `pending`, `handover`, `received`, `rejected` |
| Transaction | `pending`, `paid`, `completed`, `cancelled`, `refunded` |

## Dừng project

Tắt backend và frontend bằng `Ctrl+C` trong terminal đang chạy.

Dừng PostgreSQL:

```bash
docker compose down
```

Xóa cả volume database nếu muốn seed lại từ đầu:

```bash
docker compose down -v
```
