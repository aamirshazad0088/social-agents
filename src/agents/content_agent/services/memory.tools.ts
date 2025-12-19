import { randomUUID } from 'crypto';
import { tool } from 'langchain';
import * as z from 'zod';
import type { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

export interface MemoryToolContext {
  workspaceId?: string | null;
  userId?: string | null;
}

function getNamespace(context: MemoryToolContext): [string, string] {
  const userId = context.workspaceId || context.userId || 'global';
  return [userId, 'memories'];
}

export function createMemoryTools(
  store: PostgresStore,
  context: MemoryToolContext = {}
) {
  const saveMemory = tool(
    async ({ memory }) => {
      const namespace = getNamespace(context);
      await store.put(namespace, randomUUID(), { text: memory });
      return 'Memory saved.';
    },
    {
      name: 'save_memory',
      description: 'Save important information to remember for future conversations.',
      schema: z.object({
        memory: z.string().describe('The information to remember'),
      }),
    }
  );

  const recallMemory = tool(
    async ({ query }) => {
      const namespace = getNamespace(context);
      const memories = await store.search(namespace, { query, limit: 5 });

      if (!memories.length) {
        return 'No memories found.';
      }

      return memories
        .map((item) => item.value.text)
        .filter(Boolean)
        .join('\n');
    },
    {
      name: 'recall_memory',
      description: 'Search and retrieve saved memories.',
      schema: z.object({
        query: z.string().describe('Search query to find relevant memories'),
      }),
    }
  );

  return [saveMemory, recallMemory];
}
