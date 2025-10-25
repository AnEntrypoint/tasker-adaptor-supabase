import { createClient } from '@supabase/supabase-js';
import StorageAdapter from '../core/storage-adapter.js';

/**
 * Supabase storage adapter
 * Stores task data in Supabase database
 */
export class SupabaseAdapter extends StorageAdapter {
  constructor(url, serviceKey, anonKey) {
    super();
    this.url = url;
    this.serviceKey = serviceKey;
    this.anonKey = anonKey;
    this.client = null;
    this.admin = null;
  }

  async init() {
    this.client = createClient(this.url, this.anonKey);
    this.admin = createClient(this.url, this.serviceKey);
  }

  async createTaskRun(taskRun) {
    const { data, error } = await this.admin
      .from('task_runs')
      .insert(taskRun)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTaskRun(id) {
    const { data, error } = await this.client
      .from('task_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async updateTaskRun(id, updates) {
    const { data, error } = await this.admin
      .from('task_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async queryTaskRuns(filter) {
    let query = this.client.from('task_runs').select('*');

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createStackRun(stackRun) {
    const { data, error } = await this.admin
      .from('stack_runs')
      .insert(stackRun)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getStackRun(id) {
    const { data, error } = await this.client
      .from('stack_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async updateStackRun(id, updates) {
    const { data, error } = await this.admin
      .from('stack_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async queryStackRuns(filter) {
    let query = this.client.from('stack_runs').select('*');

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getPendingStackRuns() {
    const { data, error } = await this.client
      .from('stack_runs')
      .select('*')
      .in('status', ['pending', 'suspended_waiting_child'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async storeTaskFunction(taskFunction) {
    const { data, error } = await this.admin
      .from('task_functions')
      .upsert({
        identifier: taskFunction.identifier,
        code: taskFunction.code,
        metadata: taskFunction.metadata,
        updated_at: new Date().toISOString()
      }, { onConflict: 'identifier' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTaskFunction(identifier) {
    const { data, error } = await this.client
      .from('task_functions')
      .select('*')
      .eq('identifier', identifier)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async setKeystore(key, value) {
    const { error } = await this.admin
      .from('keystore')
      .upsert({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;
  }

  async getKeystore(key) {
    const { data, error } = await this.client
      .from('keystore')
      .select('value')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    try {
      return JSON.parse(data.value);
    } catch (e) {
      return data.value;
    }
  }

  async deleteKeystore(key) {
    const { error } = await this.admin
      .from('keystore')
      .delete()
      .eq('key', key);

    if (error) throw error;
  }

  async close() {
    // Supabase client doesn't need explicit close
  }
}

export default SupabaseAdapter;
