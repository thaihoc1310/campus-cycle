from datetime import date, datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr

UserRole = Literal["admin", "member"]
UserStatus = Literal["active", "inactive"]
UserType = Literal["student", "teacher", "staff"]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    date_of_birth: date | None = None
    user_type: UserType | None = None


class AdminUserCreate(UserCreate):
    role: UserRole = "member"
    status: UserStatus = "active"


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    role: UserRole | None = None
    user_type: UserType | None = None
    status: UserStatus | None = None


class ProfileUpdate(BaseModel):
    name: str
    phone: str | None = None
    date_of_birth: date | None = None
    user_type: UserType | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar_url: str | None
    phone: str | None
    date_of_birth: date | None
    role: str
    user_type: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
