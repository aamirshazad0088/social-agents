/**
 * Comment Agent Memory Service
 * Provides checkpointing and persistent storage for conversation memory
 */

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

interface MemoryLayer {
  checkpointer: PostgresSaver;
  store: PostgresStore;
}

let memoryLayerPromise: Promise<MemoryLayer> | null = null;

/**
 * Mask sensitive parts of connection string for logging
 */
function maskConnectionString(connectionString: string): string {
  return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
}

/**
 * Create the memory layer with checkpointer and store
 */
async function createMemoryLayer(): Promise<MemoryLayer> {
  const connectionString =
    process.env.COMMENT_AGENT_DATABASE_URL ||
    process.env.CONTENT_AGENT_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL env var for comment agent memory.');
  }


  try {
    const checkpointer = PostgresSaver.fromConnString(connectionString);
    await checkpointer.setup();

    const store = PostgresStore.fromConnString(connectionString);
    await store.setup();

    return { checkpointer, store };
  } catch (error) {
    throw error;
  }
}

/**
 * Get or create the comment agent memory layer (singleton pattern)
 */
export async function getCommentAgentMemory(): Promise<MemoryLayer> {
  if (!memoryLayerPromise) {
    memoryLayerPromise = createMemoryLayer();
  }
  return memoryLayerPromise;
}

/**
 * Check if memory layer is available (for graceful fallback)
 */
export async function isMemoryAvailable(): Promise<boolean> {
  try {
    await getCommentAgentMemory();
    return true;
  } catch {
    return false;
  }
}
