# tasker-adaptor-supabase

Supabase-specific adaptor for tasker-sequential with PostgreSQL backend and edge function deployment.

## Architecture

tasker-adaptor-supabase provides:
- **SupabaseAdapter**: Implements StorageAdapter interface for PostgreSQL
- **Edge Functions**: Supabase-specific endpoint wrappers
- **Database Schema**: PostgreSQL migrations for task execution
- **Service Wrappers**: Integration with Google APIs, keystore, etc.

## Storage Adapter

The SupabaseAdapter implements the base StorageAdapter interface from tasker-adaptor:

```javascript
import { SupabaseAdapter } from 'tasker-adaptor-supabase';

const adapter = new SupabaseAdapter(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  process.env.SUPABASE_ANON_KEY
);

await adapter.init();

// Use with TaskExecutor from tasker-adaptor
const executor = new TaskExecutor(adapter);
const result = await executor.execute(taskRun, taskCode);
```

## Edge Functions

Edge function endpoints wrap core task execution for Supabase deployment:

- **`tasks/index.ts`** - Main task submission and execution endpoint
- **`deno-executor/index.ts`** - Deno-based task runtime (uses TaskExecutor)
- **`simple-stack-processor/index.ts`** - Stack run processor (processes pending operations)
- **`wrappedgapi/index.ts`** - Google API wrapper for wrapped service calls
- **`wrappedkeystore/index.ts`** - Credential storage wrapper
- **`wrappedsupabase/index.ts`** - Database operation proxy
- **`wrappedopenai/index.ts`** - OpenAI API wrapper
- **`wrappedwebsearch/index.ts`** - Web search integration wrapper
- **`admin-debug/index.ts`** - Debugging and admin utilities

## Database Schema

PostgreSQL migrations define the schema:

1. **001_create_task_tables.sql** - Core tables:
   - `task_functions` - Published task code
   - `task_runs` - Task execution instances
   - `stack_runs` - Individual operations in execution chain
   - `keystore` - Credential storage

2. **002_create_keystore_table.sql** - Credential management

3. **003_add_simple_test_task.sql** - Example test task

4. **004_add_waiting_column_to_stack_runs.sql** - Optimization for pending queries

5. **005_add_resume_payload_column.sql** - Resume data storage

6. **006_add_suspended_at_column.sql** - Suspension timing

7. **20250826113115_create_task_locks_table.sql** - Concurrency control

### Core Tables

**task_runs**
- `id` - Primary key
- `task_identifier` - Task name
- `status` - execution status (pending, running, suspended_waiting_child, completed, failed)
- `input` - Task input parameters
- `result` - Task result
- `error` - Error message if failed
- `created_at` / `updated_at` - Timestamps

**stack_runs**
- `id` - Primary key
- `task_run_id` - Parent task
- `parent_stack_run_id` - Parent operation (for chaining)
- `operation` - Service call (gapi, keystore, supabase, etc.)
- `status` - execution status
- `input` - Operation parameters
- `result` - Operation result
- `resume_payload` - Data for resuming parent task
- `suspended_at` - Suspension timestamp
- `created_at` / `updated_at` - Timestamps

**task_functions**
- `id` - Primary key
- `identifier` - Task name
- `code` - Task JavaScript code
- `metadata` - Additional metadata
- `created_at` / `updated_at` - Timestamps

**keystore**
- `id` - Primary key
- `key` - Credential key
- `value` - Credential value
- `created_at` / `updated_at` - Timestamps

## Configuration

**config.toml** - Supabase project configuration:
- API port: 54321
- Database port: 54322
- Edge function configuration
- Auth settings
- Storage settings

Environment variables (in .env):
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
```

## Deployment

### Local Development

Start Supabase with migrations:
```bash
supabase start
```

Serve edge functions:
```bash
supabase functions serve tasks deno-executor simple-stack-processor wrappedgapi wrappedkeystore wrappedsupabase
```

### Production Deployment

Deploy to Supabase cloud:
```bash
supabase link --project-ref your-project
supabase push
```

## Service Wrappers

All external integrations use wrapped edge functions:

**wrappedgapi** - Google API calls
- Authenticates with service account credentials
- Supports domain impersonation for admin APIs
- Caches credentials in keystore

**wrappedkeystore** - Credential management
- Stores/retrieves credentials (gapi, emails, tokens)
- Uses Supabase as backend

**wrappedsupabase** - Database operations
- Proxies all database queries
- Implements query chaining for complex operations
- Handles transactions

**wrappedopenai** - OpenAI integration
- Calls OpenAI APIs with stored credentials
- Supports all OpenAI models and endpoints

**wrappedwebsearch** - Web search
- Searches the web and returns results
- Integrates with external search APIs

## Task Execution Flow

1. **Submission**: Client calls `/functions/v1/tasks` with task identifier and input
2. **Creation**: Task run created in database
3. **Processing**: simple-stack-processor HTTP chain triggered
4. **Execution**: deno-executor runs task code
5. **Suspension**: External calls suspend task and create child stack run
6. **Service Call**: simple-stack-processor processes child via wrapped service
7. **Resume**: Parent resumes with child results
8. **Completion**: Task marked complete and result stored

## Debugging

Monitor task execution:
```bash
# Check task status
curl http://localhost:54321/rest/v1/task_runs

# Monitor stack runs
curl http://localhost:54321/rest/v1/stack_runs

# Watch Supabase logs
supabase functions list
supabase functions logs tasks --local
```

## Key Principles

- **PostgreSQL backend**: Reliable, scalable, production-ready
- **Edge functions**: Low-latency execution, automatic scaling
- **Service wrappers**: All external calls go through wrapped endpoints
- **Database-driven**: Stack processor uses database locks for concurrency
- **HTTP chains**: No polling, pure request-response causality

## Related Packages

- **tasker-sequential** - Core task execution engine (deployment-agnostic)
- **tasker-adaptor** - Base adaptor interface and execution logic
- **tasker-adaptor-sqlite** - SQLite adaptor for local development
