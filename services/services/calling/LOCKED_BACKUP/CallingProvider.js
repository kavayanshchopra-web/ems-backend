/**
 * Abstract Base Class for Telephony Calling Providers (ESM)
 */
export default class CallingProvider {
  constructor(name) {
    if (new.target === CallingProvider) {
      throw new TypeError("Cannot construct CallingProvider instances directly.");
    }
    this.name = name;
  }

  async initiateCall(params) {
    throw new Error("Method 'initiateCall()' must be implemented.");
  }

  async endCall(params) {
    throw new Error("Method 'endCall()' must be implemented.");
  }

  processWebhook(payload) {
    throw new Error("Method 'processWebhook()' must be implemented.");
  }
}