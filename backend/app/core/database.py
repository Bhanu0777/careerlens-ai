"""
Supabase Database Configuration
"""
import os
from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

def get_supabase() -> Client:
    """Get Supabase client instance"""
    return supabase


import jwt as pyjwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def verify_supabase_jwt(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """Verify a Supabase JWT and return the payload. Raises 401 if invalid.
    Returns empty dict if no credentials and auto_error=False.
    """
    if not credentials:
        # Return empty dict — auth is optional in this project
        return {}

    token = credentials.credentials
    try:
        jwt_secret = os.environ.get('SUPABASE_JWT_SECRET', '')
        if not jwt_secret:
            # Development fallback: decode without verifying signature
            payload = pyjwt.decode(
                token,
                options={'verify_signature': False},
                algorithms=['HS256']
            )
            return payload
        payload = pyjwt.decode(
            token,
            jwt_secret,
            algorithms=['HS256'],
            audience='authenticated'
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f'Invalid token: {e}')


def get_current_user_id(payload: dict) -> str | None:
    """Extract user ID from JWT payload. Returns None if not present (auth is optional)."""
    return payload.get('sub')
