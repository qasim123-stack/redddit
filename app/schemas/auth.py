"""Authentication request and response schemas"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserRegister(BaseModel):
    """Schema for user registration request"""

    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "user@example.com",
                    "password": "securepassword123",
                    "full_name": "John Doe"
                }
            ]
        }
    }


class UserLogin(BaseModel):
    """Schema for user login request"""

    email: EmailStr
    password: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "user@example.com",
                    "password": "securepassword123"
                }
            ]
        }
    }


class Token(BaseModel):
    """Schema for JWT token response"""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data"""

    user_id: Optional[int] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user data in responses"""

    id: int
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    subscription_tier: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Schema for authentication response (login/register)"""

    user: UserResponse
    access_token: str
    token_type: str = "bearer"
