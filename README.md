# Tasker Adaptor Supabase

Supabase PostgreSQL storage backend for `tasker-sequential` via `tasker-adaptor`.

## Features

- **Supabase Backend**: PostgreSQL via Supabase
- **Managed Database**: No local database setup required
- **Scalable**: Production-ready performance
- **Integrated**: Works with existing Supabase projects

## Installation

```bash
npm install tasker-adaptor tasker-adaptor-supabase
```

## Quick Start

```javascript
import { SupabaseAdapter } from 'tasker-adaptor-supabase';
import { TaskExecutor } from 'tasker-adaptor';

const adapter = new SupabaseAdapter(
  'https://your-project.supabase.co',
  'your-service-key',
  'your-anon-key'
);

await adapter.init();

const executor = new TaskExecutor(adapter);
const result = await executor.execute(taskRun, taskCode);
```

## Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

The Supabase backend uses these tables (created automatically by Supabase migrations):

- `task_runs` - Task execution records
- `stack_runs` - Service call records
- `task_functions` - Published task code
- `keystore` - Credentials and configuration

## Testing

```bash
npm test
```

## Integration with tasker-adaptor

This package extends `tasker-adaptor` with Supabase-specific storage:

```javascript
import { SupabaseAdapter } from 'tasker-adaptor-supabase';
import { TaskExecutor, StackProcessor, ServiceClient } from 'tasker-adaptor';

const adapter = new SupabaseAdapter(url, serviceKey, anonKey);
await adapter.init();

const executor = new TaskExecutor(adapter);
const processor = new StackProcessor(adapter);
```

## Other Backends

- **tasker-adaptor-sqlite** - Local SQLite backend for development
- **tasker-adaptor** - Base interfaces and core logic

## License

MIT
