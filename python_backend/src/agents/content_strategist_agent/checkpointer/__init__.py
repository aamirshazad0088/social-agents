"""
Content Strategist Agent - Checkpointer Module

PostgreSQL-based checkpointing for conversation persistence.
Manages connection pooling and async operations.
"""
import logging
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.memory import MemorySaver

from ....config import settings

try:
    from psycopg_pool import AsyncConnectionPool
except ImportError:
    AsyncConnectionPool = None

logger = logging.getLogger(__name__)

# Global references managed by lifespan
_checkpointer = None
_checkpointer_context = None


async def init_checkpointer():
    """
    Initialize the AsyncPostgresSaver checkpointer.
    Call this at application startup (in FastAPI lifespan).
    
    Uses prepare_threshold=0 for Supabase pooler compatibility.
    """
    global _checkpointer, _checkpointer_context
    
    if _checkpointer is not None:
        logger.info("Checkpointer already initialized, skipping")
        return _checkpointer
    
    db_uri = settings.DATABASE_URL
    if not db_uri:
        logger.warning("DATABASE_URL not configured, using in-memory checkpointer")
        _checkpointer = MemorySaver()
        return _checkpointer
    
    try:
        if AsyncConnectionPool:
            _checkpointer_context = AsyncConnectionPool(
                conninfo=db_uri,
                max_size=10,
                min_size=1,
                open=False,
                kwargs={
                    "autocommit": True,
                    "prepare_threshold": 0,
                }
            )
            await _checkpointer_context.open()
            _checkpointer = AsyncPostgresSaver(conn=_checkpointer_context)
            await _checkpointer.setup()
            logger.info("AsyncPostgresSaver initialized with connection pool")
        else:
            from psycopg import AsyncConnection
            from psycopg.rows import dict_row
            
            conn = await AsyncConnection.connect(
                db_uri,
                autocommit=True,
                prepare_threshold=0,
                row_factory=dict_row,
            )
            _checkpointer = AsyncPostgresSaver(conn=conn)
            _checkpointer_context = conn
            await _checkpointer.setup()
            logger.info("AsyncPostgresSaver initialized with single connection")
            
        return _checkpointer
    except Exception as e:
        logger.error(f"Failed to initialize AsyncPostgresSaver: {e}")
        logger.warning("Falling back to in-memory checkpointer")
        _checkpointer = MemorySaver()
        return _checkpointer


async def close_checkpointer():
    """Close the checkpointer connection at shutdown."""
    global _checkpointer, _checkpointer_context
    
    if _checkpointer_context is not None:
        try:
            await _checkpointer_context.close()
            logger.info("Checkpointer closed")
        except Exception as e:
            logger.error(f"Error closing checkpointer: {e}")
    
    _checkpointer = None
    _checkpointer_context = None


def get_checkpointer():
    """Get the current checkpointer instance."""
    global _checkpointer
    if _checkpointer is None:
        logger.warning("Checkpointer not initialized, using in-memory fallback")
        _checkpointer = MemorySaver()
    return _checkpointer


__all__ = ["init_checkpointer", "close_checkpointer", "get_checkpointer"]
