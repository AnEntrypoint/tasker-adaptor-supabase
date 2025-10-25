import ServiceClient from './service-client.js';

/**
 * Stack processor for handling pending stack runs
 * Processes service calls created by suspended tasks
 */
export class StackProcessor {
  constructor(storage, serviceClient) {
    this.storage = storage;
    this.serviceClient = serviceClient || new ServiceClient();
  }

  /**
   * Process all pending stack runs
   * @returns {Promise<void>}
   */
  async processPending() {
    const pending = await this.storage.getPendingStackRuns();

    for (const stackRun of pending) {
      await this.processStackRun(stackRun);
    }
  }

  /**
   * Process a specific stack run
   * @param {Object} stackRun - Stack run to process
   * @returns {Promise<void>}
   */
  async processStackRun(stackRun) {
    try {
      // Skip if already processing
      if (stackRun.status === 'in_progress') {
        return;
      }

      // Update status
      await this.storage.updateStackRun(stackRun.id, {
        status: 'in_progress'
      });

      // Extract service call details
      const input = stackRun.input;
      const { serviceName, methodPath, args } = input;

      // Call the service
      const result = await this.serviceClient.call(serviceName, methodPath, args);

      // Update with result
      await this.storage.updateStackRun(stackRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });

      // If this was a child of a suspended task, resume the parent
      if (stackRun.parent_stack_run_id) {
        await this._resumeParentTask(stackRun);
      }
    } catch (error) {
      await this.storage.updateStackRun(stackRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });
    }
  }

  async _resumeParentTask(childStackRun) {
    // Get parent stack run
    const parentStackRun = await this.storage.getStackRun(childStackRun.parent_stack_run_id);
    if (!parentStackRun) return;

    // Get task run
    const taskRun = await this.storage.getTaskRun(childStackRun.task_run_id);
    if (!taskRun) return;

    // Mark parent as suspended_waiting_child
    await this.storage.updateStackRun(parentStackRun.id, {
      status: 'suspended_waiting_child',
      resume_payload: JSON.stringify({
        result: childStackRun.result
      })
    });

    // Get task function code
    const taskFunction = await this.storage.getTaskFunction(taskRun.task_identifier);
    if (!taskFunction) return;

    // Resume task
    const resumePayload = childStackRun.result ? JSON.parse(childStackRun.result) : null;

    // Import TaskExecutor to avoid circular dependency
    const { TaskExecutor } = await import('./task-executor.js');
    const executor = new TaskExecutor(this.storage, this.serviceClient);

    await executor.resume(taskRun, resumePayload, taskFunction.code);
  }
}

export default StackProcessor;
