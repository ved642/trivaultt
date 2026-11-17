import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Alphanumeric username (3-50 chars)")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password (8-128 chars)")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9_-]+$", clean):
            raise ValueError("Username can only contain alphanumeric characters, underscores, and hyphens.")
        return clean


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username or registered email")
    password: str = Field(..., min_length=1, description="Account password")


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    has_vault_password: bool = False

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class VaultStatusResponse(BaseModel):
    has_vault_password: bool


class SetVaultPasswordRequest(BaseModel):
    vault_password: str = Field(..., min_length=4, max_length=128, description="Vault password or PIN (min 4 chars)")
    account_password: str = Field(..., min_length=1, description="Account password to verify identity")


class VerifyVaultPasswordRequest(BaseModel):
    vault_password: str = Field(..., min_length=1, description="Vault password or PIN")


class ChangeVaultPasswordRequest(BaseModel):
    current_vault_password: str = Field(..., min_length=1, description="Current vault password")
    new_vault_password: str = Field(..., min_length=4, max_length=128, description="New vault password (min 4 chars)")


class RemoveVaultPasswordRequest(BaseModel):
    account_password: str = Field(..., min_length=1, description="Account password to confirm removal")


class VaultMessageResponse(BaseModel):
    success: bool = True
    message: str
    has_vault_password: bool
