# Tasker Adaptor Supabase

Storage and service adaptor for `tasker-sequential` that supports both Supabase and SQLite backends, enabling task execution on Deno, Bun, and Node.js without Supabase edge functions.

## Features

- **Pluggable Storage**: Support for Supabase and SQLite backends
- **Service Client**: HTTP-based and direct service calls
- **Task Execution**: Automatic suspend/resume on external service calls
- **Stack Processing**: Sequential processing of service calls
- **Generic Code**: Works with Deno, Bun, and Node.js

## Installation

```bash
npm install tasker-adaptor-supabase
```

## Quick Start

### Using Supabase

```javascript
import { SupabaseAdapter, TaskExecutor } from 'tasker-adaptor-supabase';

const adapter = new SupabaseAdapter(
  'https://your-project.supabase.co',
  'your-service-key',
  'your-anon-key'
);

await adapter.init();

const executor = new TaskExecutor(adapter);
const result = await executor.execute(taskRun, taskCode);
```

### Using SQLite

```javascript
import { SQLiteAdapter, TaskExecutor } from 'tasker-adaptor-supabase';

const adapter = new SQLiteAdapter('./tasks.db');
await adapter.init();

const executor = new TaskExecutor(adapter);
const result = await executor.execute(taskRun, taskCode);
```

## Storage Adapters

All storage adapters implement the `StorageAdapter` interface with the following methods:

### Task Runs
- `createTaskRun(taskRun)` - Create a new task run
- `getTaskRun(id)` - Get task run by ID
- `updateTaskRun(id, updates)` - Update task run
- `queryTaskRuns(filter)` - Query task runs

### Stack Runs
- `createStackRun(stackRun)` - Create a new stack run (service call)
- `getStackRun(id)` - Get stack run by ID
- `updateStackRun(id, updates)` - Update stack run
- `queryStackRuns(filter)` - Query stack runs
- `getPendingStackRuns()` - Get pending stack runs

### Task Functions
- `storeTaskFunction(taskFunction)` - Store task code
- `getTaskFunction(identifier)` - Get task code

### Keystore
- `setKeystore(key, value)` - Store credential/config
- `getKeystore(key)` - Get credential/config
- `deleteKeystore(key)` - Delete credential/config

## Service Client

The `ServiceClient` calls wrapped services (gapi, keystore, database, etc).

```javascript
import { ServiceClient } from 'tasker-adaptor-supabase';

const client = new ServiceClient({
  type: 'http', // or 'direct' for Deno/Bun
  baseUrl: 'http://localhost:54321',
  authToken: 'your-token'
});

const result = await client.call('gapi', 'users.list', { domain: 'example.com' });
```

## Task Execution

Tasks execute with automatic suspend/resume:

```javascript
const taskCode = `
  const domains = await __callHostTool__('gapi', 'admin.domains.list', {});
  return { domains };
`;

const taskRun = {
  id: 1,
  task_identifier: 'example-task',
  input: {},
  status: 'pending'
};

const executor = new TaskExecutor(adapter, serviceClient);
const result = await executor.execute(taskRun, taskCode);

// If task calls __callHostTool__, it suspends and returns:
// { suspended: true, suspensionData: { taskRunId, childStackRunId, ... } }

// After service call completes, resume:
await executor.resume(taskRun, childResult, taskCode);
```

## Stack Processing

Process pending stack runs (service calls):

```javascript
import { StackProcessor } from 'tasker-adaptor-supabase';

const processor = new StackProcessor(adapter, serviceClient);

// Process all pending
await processor.processPending();

// Or process specific
await processor.processStackRun(stackRun);
```

## Database Schema (SQLite)

```sql
-- Task execution runs
CREATE TABLE task_runs (
  id INTEGER PRIMARY KEY,
  task_identifier TEXT,
  status TEXT,
  input TEXT,
  result TEXT,
  error TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Service calls created by tasks
CREATE TABLE stack_runs (
  id INTEGER PRIMARY KEY,
  task_run_id INTEGER,
  parent_stack_run_id INTEGER,
  operation TEXT,
  status TEXT,
  input TEXT,
  result TEXT,
  error TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Task code storage
CREATE TABLE task_functions (
  id INTEGER PRIMARY KEY,
  identifier TEXT UNIQUE,
  code TEXT,
  metadata TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Credentials and configuration
CREATE TABLE keystore (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
npm run test:supabase
npm run test:sqlite

# Development with auto-reload
npm run dev
```

## Environment Variables

### Supabase

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

### Service Client

```
SERVICE_CLIENT_TYPE=http
SERVICE_CLIENT_BASE_URL=http://localhost:54321
SERVICE_CLIENT_AUTH_TOKEN=your-token
```

## Architecture

The adaptor decouples task execution from storage implementation:

1. **Storage Adapter**: Abstract interface for persisting task/stack runs
2. **Service Client**: Calls external services (Google API, Keystore, etc)
3. **Task Executor**: Runs task code with suspend/resume on service calls
4. **Stack Processor**: Processes pending service calls in order

This allows:
- Running on any JavaScript runtime (Node.js, Deno, Bun)
- Switching storage backends without code changes
- Testing with SQLite, deploying with Supabase
- Generic task code without Supabase-specific logic

## License

MIT
