import ServiceClient from './service-client.js';

/**
 * Task executor that runs task code with automatic suspend/resume
 */
export class TaskExecutor {
  constructor(storage, serviceClient) {
    this.storage = storage;
    this.serviceClient = serviceClient || new ServiceClient();
  }

  /**
   * Execute a task
   * @param {Object} taskRun - Task run record
   * @param {string} taskCode - Task code to execute
   * @returns {Promise<Object>} Execution result
   */
  async execute(taskRun, taskCode) {
    try {
      // Create initial stack run
      const stackRun = await this.storage.createStackRun({
        task_run_id: taskRun.id,
        operation: 'task_init',
        status: 'in_progress',
        input: taskRun.input
      });

      // Create execution context with suspend/resume capability
      const context = {
        taskRun,
        stackRun,
        storage: this.storage,
        serviceClient: this.serviceClient,
        suspended: false,
        suspensionData: null
      };

      // Execute task code
      let result;
      try {
        result = await this._executeCode(taskCode, context);
      } catch (error) {
        if (error.message === 'TASK_SUSPENDED') {
          // Task suspended - return suspension data
          return {
            suspended: true,
            suspensionData: context.suspensionData
          };
        }
        throw error;
      }

      // Update task run with completion
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });

      return { success: true, result };
    } catch (error) {
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });

      throw error;
    }
  }

  /**
   * Resume a suspended task with results from child call
   * @param {Object} taskRun - Task run record
   * @param {Object} resumePayload - Results from child call
   * @param {string} taskCode - Task code to resume
   * @returns {Promise<Object>} Execution result
   */
  async resume(taskRun, resumePayload, taskCode) {
    try {
      const context = {
        taskRun,
        storage: this.storage,
        serviceClient: this.serviceClient,
        suspended: false,
        suspensionData: null,
        resumePayload
      };

      let result;
      try {
        result = await this._executeCode(taskCode, context, resumePayload);
      } catch (error) {
        if (error.message === 'TASK_SUSPENDED') {
          return {
            suspended: true,
            suspensionData: context.suspensionData
          };
        }
        throw error;
      }

      await this.storage.updateTaskRun(taskRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });

      return { success: true, result };
    } catch (error) {
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message })
      });

      throw error;
    }
  }

  async _executeCode(code, context, resumePayload) {
    // Create __callHostTool__ function that suspends execution
    const __callHostTool__ = async (serviceName, methodPath, args) => {
      // Create child stack run for the service call
      const childStackRun = await context.storage.createStackRun({
        task_run_id: context.taskRun.id,
        parent_stack_run_id: context.stackRun?.id,
        operation: `${serviceName}.${methodPath}`,
        status: 'pending',
        input: { serviceName, methodPath, args }
      });

      // Suspend task
      context.suspensionData = {
        taskRunId: context.taskRun.id,
        childStackRunId: childStackRun.id,
        serviceName,
        methodPath,
        args
      };

      throw new Error('TASK_SUSPENDED');
    };

    // Create function with context and execute
    const func = new Function('__callHostTool__', 'resumePayload', code);
    return await func(__callHostTool__, resumePayload);
  }
}

export default TaskExecutor;
