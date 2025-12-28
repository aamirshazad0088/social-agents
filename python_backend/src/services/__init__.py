"""Services module"""
from .supabase_service import (
    get_supabase_client,
    is_supabase_configured,
    upload_file,
    download_file,
    delete_file,
    db_select,
    db_insert,
    db_update,
    db_upsert,
    db_delete,
    verify_jwt,
)
from .oauth_service import (
    create_oauth_state,
    verify_oauth_state,
    generate_pkce,
    verify_pkce,
    cleanup_expired_states,
    clear_workspace_oauth_states,
)
from .storage_service import (
    storage_service,
    upload_file as storage_upload_file,
    upload_from_url,
    get_signed_url,
    delete_file as storage_delete_file,
)
from .social_service import (
    social_service,
    close_social_service,
)
from .token_refresh_service import (
    token_refresh_service,
    close_token_refresh_service,
    CredentialsResult,
    RefreshErrorType,
)

__all__ = [
    # Supabase
    "get_supabase_client",
    "is_supabase_configured",
    "upload_file",
    "download_file",
    "delete_file",
    "db_select",
    "db_insert",
    "db_update",
    "db_upsert",
    "db_delete",
    "verify_jwt",
    # OAuth
    "create_oauth_state",
    "verify_oauth_state",
    "generate_pkce",
    "verify_pkce",
    "cleanup_expired_states",
    "clear_workspace_oauth_states",
    # Storage
    "storage_service",
    "storage_upload_file",
    "upload_from_url",
    "get_signed_url",
    "storage_delete_file",
    # Social
    "social_service",
    "close_social_service",
    # Token Refresh (On-Demand)
    "token_refresh_service",
    "close_token_refresh_service",
    "CredentialsResult",
    "RefreshErrorType",
]


