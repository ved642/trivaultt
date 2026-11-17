from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import timedelta

from app.database import get_session
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    VaultStatusResponse,
    SetVaultPasswordRequest,
    VerifyVaultPasswordRequest,
    ChangeVaultPasswordRequest,
    RemoveVaultPasswordRequest,
    VaultMessageResponse,
)
from app.security.passwords import get_password_hash, verify_password
from app.security.tokens import create_access_token
from app.security.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(
    request: UserRegisterRequest,
    session: Session = Depends(get_session)
):
    """
    Registers a new user account with unique username and email.
    Hashes password using bcrypt. Never stores plaintext passwords.
    """
    # Check if username is already taken
    existing_username = session.exec(
        select(User).where(User.username == request.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username already exists."
        )

    # Check if email is already registered
    existing_email = session.exec(
        select(User).where(User.email == request.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    # Hash the password securely
    hashed_pwd = get_password_hash(request.password)

    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=hashed_pwd
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive an expiring JWT access token"
)
def login(
    request: UserLoginRequest,
    session: Session = Depends(get_session)
):
    """
    Validates user credentials and issues an HMAC-SHA256 signed JWT token.
    Uses a generic error message to prevent account enumeration.
    """
    # Support logging in with either username or email
    user = session.exec(
        select(User).where(
            (User.username == request.username) | (User.email == request.username)
        )
    ).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    settings = get_settings()
    expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    access_token = create_access_token(
        subject=user.id,
        additional_claims={"username": user.username},
        expires_delta=timedelta(minutes=expires_minutes)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_minutes * 60,
        user=UserResponse.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Resolves the authenticated user from the active JWT bearer token.
    """
    return current_user


@router.get(
    "/vault-status",
    response_model=VaultStatusResponse,
    summary="Check if a Vault security password/PIN is configured"
)
def get_vault_status(current_user: User = Depends(get_current_user)):
    return VaultStatusResponse(has_vault_password=current_user.has_vault_password)


@router.post(
    "/vault-password/set",
    response_model=VaultMessageResponse,
    summary="Set a security password/PIN to lock the File Vault"
)
def set_vault_password(
    request: SetVaultPasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify account password for identity authentication
    if not verify_password(request.account_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect account password."
        )

    # Hash and save vault password
    current_user.vault_password_hash = get_password_hash(request.vault_password)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return VaultMessageResponse(
        success=True,
        message="Vault security password successfully set.",
        has_vault_password=True
    )


@router.post(
    "/vault-password/verify",
    response_model=VaultMessageResponse,
    summary="Verify vault password/PIN to unlock File Vault access"
)
def verify_vault_password(
    request: VerifyVaultPasswordRequest,
    current_user: User = Depends(get_current_user)
):
    if not current_user.vault_password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No vault password has been set for this account."
        )

    if not verify_password(request.vault_password, current_user.vault_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect vault password. Access denied."
        )

    return VaultMessageResponse(
        success=True,
        message="Vault unlocked successfully.",
        has_vault_password=True
    )


@router.post(
    "/vault-password/change",
    response_model=VaultMessageResponse,
    summary="Change existing vault security password"
)
def change_vault_password(
    request: ChangeVaultPasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not current_user.vault_password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No vault password is set. Please set a password first."
        )

    if not verify_password(request.current_vault_password, current_user.vault_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current vault password."
        )

    current_user.vault_password_hash = get_password_hash(request.new_vault_password)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return VaultMessageResponse(
        success=True,
        message="Vault password changed successfully.",
        has_vault_password=True
    )


@router.post(
    "/vault-password/remove",
    response_model=VaultMessageResponse,
    summary="Remove vault password protection"
)
def remove_vault_password(
    request: RemoveVaultPasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not verify_password(request.account_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect account password."
        )

    current_user.vault_password_hash = None
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return VaultMessageResponse(
        success=True,
        message="Vault password protection removed.",
        has_vault_password=False
    )

