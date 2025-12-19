"""
Content Agent Memory Service
PostgreSQL-based persistence for LangChain agents using LangGraph checkpointer
"""
import logging
from typing import Optional

try:
    from langgraph.checkpoint.postgres import PostgresSaver
    from langgraph.store.postgres import PostgresStore
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    PostgresSaver = None
    PostgresStore = None

from ...config import settings

logger = logging.getLogger(__name__)

# Module-level singleton for memory layer
_memory_layer: Optional["MemoryLayer"] = None


class MemoryLayer:
    """
    Memory layer with PostgreSQL checkpointer and store
    Provides conversation history and long-term memory
    """
    
    def __init__(self, checkpointer: PostgresSaver, store: PostgresStore):
        self.checkpointer = checkpointer
        self.store = store
    
    @classmethod
    async def create(cls, connection_string: str) -> "MemoryLayer":
        """
        Create and initialize memory layer
        
        Args:
            connection_string: PostgreSQL connection string
            
        Returns:
            MemoryLayer instance
        """
        try:
            # Create checkpointer for short-term memory (thread-scoped state)
            checkpointer = PostgresSaver.from_conn_string(connection_string)
            await checkpointer.setup()
            
            # Create store for long-term memory (cross-session data)
            store = PostgresStore.from_conn_string(connection_string)
            await store.setup()
            
            logger.info("✅ Memory layer initialized successfully")
            return cls(checkpointer=checkpointer, store=store)
        
        except Exception as e:
            logger.error(f"❌ Failed to initialize memory layer: {e}")
            raise
    
    async def close(self):
        """Cleanup resources"""
        try:
            if hasattr(self.checkpointer, 'close'):
                await self.checkpointer.close()
            if hasattr(self.store, 'close'):
                await self.store.close()
            logger.info("✅ Memory layer closed successfully")
        except Exception as e:
            logger.error(f"❌ Error closing memory layer: {e}")


async def get_content_agent_memory() -> MemoryLayer:
    """
    Get or create the content agent memory layer singleton
    
    Returns:
        MemoryLayer instance
        
    Raises:
        ValueError: If DATABASE_URL is not configured or PostgreSQL is not available
    """
    global _memory_layer
    
    if _memory_layer is not None:
        return _memory_layer
    
    if not POSTGRES_AVAILABLE:
        raise ValueError(
            "PostgreSQL support is not available. "
            "Install psycopg with: pip install 'psycopg[binary,pool]'"
        )
    
    connection_string = settings.DATABASE_URL
    if not connection_string:
        raise ValueError(
            "DATABASE_URL environment variable is required for content agent memory. "
            "Please configure a PostgreSQL connection string."
        )
    
    logger.info("Initializing content agent memory layer...")
    _memory_layer = await MemoryLayer.create(connection_string)
    return _memory_layer


async def close_content_agent_memory():
    """Close and cleanup memory layer"""
    global _memory_layer
    
    if _memory_layer is not None:
        await _memory_layer.close()
        _memory_layer = None
