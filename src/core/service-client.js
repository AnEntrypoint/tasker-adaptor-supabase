/**
 * Service client for making calls to wrapped services
 * Supports both HTTP-based edge functions and direct function calls
 */

export class ServiceClient {
  constructor(config = {}) {
    this.config = {
      type: config.type || 'http', // 'http' for edge functions, 'direct' for Deno/Bun
      baseUrl: config.baseUrl || 'http://localhost:54321',
      authToken: config.authToken || '',
      ...config
    };
  }

  /**
   * Call a wrapped service
   * @param {string} serviceName - Service name (gapi, keystore, database, etc)
   * @param {string} method - Method name
   * @param {any} params - Parameters
   * @returns {Promise<any>} Result from service
   */
  async call(serviceName, method, params) {
    if (this.config.type === 'http') {
      return this._callViaHttp(serviceName, method, params);
    } else if (this.config.type === 'direct') {
      return this._callDirect(serviceName, method, params);
    }

    throw new Error(`Unknown service client type: ${this.config.type}`);
  }

  async _callViaHttp(serviceName, method, params) {
    const serviceMap = {
      'database': 'wrappedsupabase',
      'keystore': 'wrappedkeystore',
      'openai': 'wrappedopenai',
      'websearch': 'wrappedwebsearch',
      'gapi': 'wrappedgapi'
    };

    const actualServiceName = serviceMap[serviceName] || serviceName;
    const url = `${this.config.baseUrl}/functions/v1/${actualServiceName}`;

    const requestBody = {
      chain: [{ property: method, args: params }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Service call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.result || result;
  }

  async _callDirect(serviceName, method, params) {
    // This would be implemented by loading Deno/Bun modules directly
    // For now, throw a helpful error
    throw new Error(`Direct service calls not yet implemented for service: ${serviceName}`);
  }
}

export default ServiceClient;
