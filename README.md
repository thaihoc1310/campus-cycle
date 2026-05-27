# Campus Cycle

Ứng dụng gồm:

- `backend`: FastAPI + SQLAlchemy + Alembic
- `frontend`: React + Vite
- `postgres`: chạy bằng Docker Compose

## Yêu cầu

- Python 3.12
- Node.js và pnpm
- Docker / Docker Compose

## Chạy database

```bash
docker compose up -d postgres
```

PostgreSQL mặc định:

- Host: `localhost`
- Port: `5432`
- Database: `campus_cycle`
- User: `campus_user`
- Password: `campus_pass_2024`

Docker Compose sẽ tự tạo database và database user ở trên. Nếu không dùng Docker, tạo thủ công trong PostgreSQL:

```sql
CREATE USER campus_user WITH PASSWORD 'campus_pass_2024';
CREATE DATABASE campus_cycle OWNER campus_user;
GRANT ALL PRIVILEGES ON DATABASE campus_cycle TO campus_user;
```

## Chạy backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. python -m app.seed
PYTHONPATH=. uvicorn app.main:app --port 8000 --reload
```

Backend chạy tại:

- API: `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`

Tài khoản admin seed mặc định:

- Email: `admin@campus-cycle.com`
- Password: `admin123`

## Tạo user thường

Sau khi backend chạy, có thể tạo user qua API:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo User",
    "email": "user@campus-cycle.com",
    "password": "user123",
    "user_type": "student"
  }'
```

## Chạy frontend

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

Vite đã proxy các request `/api` và `/uploads` sang backend `http://localhost:8000`.

## Dừng project

Tắt backend/frontend bằng `Ctrl+C` trong terminal đang chạy.

Dừng database:

```bash
docker compose down
```
