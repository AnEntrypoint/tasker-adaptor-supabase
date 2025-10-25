export { default as StorageAdapter } from './core/storage-adapter.js';
export { SupabaseAdapter } from './adapters/supabase.js';
export { SQLiteAdapter } from './adapters/sqlite.js';
export { ServiceClient } from './core/service-client.js';
export { TaskExecutor } from './core/task-executor.js';
export { StackProcessor } from './core/stack-processor.js';

/**
 * Create a storage adapter from configuration
 */
export function createAdapter(config) {
  const { type, ...options } = config;

  if (type === 'supabase') {
    const { url, serviceKey, anonKey } = options;
    return new (require('./adapters/supabase.js').SupabaseAdapter)(url, serviceKey, anonKey);
  }

  if (type === 'sqlite') {
    const { path } = options;
    return new (require('./adapters/sqlite.js').SQLiteAdapter)(path);
  }

  throw new Error(`Unknown adapter type: ${type}`);
}

export default {
  createAdapter,
  StorageAdapter,
  SupabaseAdapter: require('./adapters/supabase.js').SupabaseAdapter,
  SQLiteAdapter: require('./adapters/sqlite.js').SQLiteAdapter,
  ServiceClient: require('./core/service-client.js').ServiceClient,
  TaskExecutor: require('./core/task-executor.js').TaskExecutor,
  StackProcessor: require('./core/stack-processor.js').StackProcessor
};
