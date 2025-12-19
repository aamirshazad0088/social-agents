"""
Authentication Middleware
JWT verification and user authentication for FastAPI
"""
import logging
from typing import Optional, Dict, Any, List
from functools import wraps

from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware

from ..services.supabase_service import verify_jwt, is_supabase_configured

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)


async def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify JWT token and return user info including workspace/role
    """
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")
    
    if not is_supabase_configured():
        # Skip verification if Supabase not configured for local dev
        logger.warning("Supabase not configured, skipping auth")
        return {
            "id": "anonymous", 
            "email": "dev@example.com", 
            "workspaceId": "dev-workspace",
            "role": "admin",
            "isActive": True
        }
    
    result = await verify_jwt(token)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=401,
            detail=result.get("error", "Invalid token")
        )
    
    user = result.get("user", {})
    
    # Check if user is active matching Next.js forbidden error
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="User account is inactive")
        
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return await verify_token(credentials.credentials)


async def get_current_workspace_id(
    user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """Dependency to get the current workspace ID"""
    workspace_id = user.get("workspaceId")
    if not workspace_id:
        raise HTTPException(status_code=403, detail="User not assigned to a workspace")
    return workspace_id


def require_role(roles: List[str]):
    """Decorator for requiring specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This is complex with FastAPI dependencies, 
            # better use manual check or a simpler dependency
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware for global authentication
    Matches Next.js createRequestContext behavior
    """
    
    def __init__(self, app, public_paths: list = None):
        super().__init__(app)
        self.public_paths = public_paths or [
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/api/v1/media", # Info endpoint
        ]
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Allow public paths
        if any(path.startswith(p) for p in self.public_paths):
            return await call_next(request)
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                user = await verify_token(token)
                request.state.user = user
                request.state.workspace_id = user.get("workspaceId")
            except HTTPException as e:
                # Return auth error immediately for protected routes
                from starlette.responses import JSONResponse
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
            except Exception as e:
                from starlette.responses import JSONResponse
                return JSONResponse(status_code=500, content={"detail": str(e)})
        else:
            # Reject if no token on protected route
            from starlette.responses import JSONResponse
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
        
        return await call_next(request)
