import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

interface MemoryLayer {
  checkpointer: PostgresSaver;
  store: PostgresStore;
}

let memoryLayerPromise: Promise<MemoryLayer> | null = null;

function maskConnectionString(connectionString: string): string {
  return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
}

async function createMemoryLayer(): Promise<MemoryLayer> {
  const connectionString = process.env.CONTENT_AGENT_DATABASE_URL || process.env.DATABASE_URL
   

  if (!connectionString) {
    throw new Error(
      'Missing CONTENT_AGENT_DATABASE_URL or DATABASE_URL env var for content agent memory.'
    );
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

export async function getContentAgentMemory(): Promise<MemoryLayer> {
  if (!memoryLayerPromise) {
    memoryLayerPromise = createMemoryLayer();
  }
  return memoryLayerPromise;
}
