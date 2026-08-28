/**
 * GHL Mock API Client
 * Used for deterministic staging tests covering pagination, 429 rate limits, and transient error retries
 */

class GhlMockClient {
  constructor(locationId = 'loc_mock_staging_123') {
    this.locationId = locationId;
    this.simulate429 = false;
    this.simulate500 = false;
    this.rateLimitHitCount = 0;
    this.transientHitCount = 0;

    this.mockPipelines = [
      {
        id: 'pipe_mock_1',
        name: 'Sales Pipeline (Mock)',
        stages: [
          { id: 'stage_mock_new', name: 'New Leads', position: 0 },
          { id: 'stage_mock_contacted', name: 'Contacted', position: 1 },
          { id: 'stage_mock_proposal', name: 'Proposal Sent', position: 2 },
          { id: 'stage_mock_won', name: 'Won', position: 3 }
        ]
      }
    ];

    this.mockCustomFields = [
      { id: 'cf_mock_budget', name: 'Deal Budget', fieldKey: 'deal_budget', dataType: 'NUMBER' },
      { id: 'cf_mock_source', name: 'Lead Source', fieldKey: 'lead_source', dataType: 'TEXT' }
    ];

    this.mockContacts = [
      { id: 'cont_mock_1', firstName: 'Alice', lastName: 'Smith', name: 'Alice Smith', email: 'alice@example.com', phone: '+15551234567' },
      { id: 'cont_mock_2', firstName: 'Bob', lastName: 'Jones', name: 'Bob Jones', email: 'bob@example.com', phone: '+15559876543' },
      { id: 'cont_mock_3', firstName: 'Charlie', lastName: 'Brown', name: 'Charlie Brown', email: 'charlie@example.com', phone: '+15555555555' }
    ];

    this.mockOpportunities = [
      { id: 'opp_mock_1', name: 'Website Redesign', monetaryValue: 5000, pipelineId: 'pipe_mock_1', pipelineStageId: 'stage_mock_proposal', contact: { id: 'cont_mock_1' }, status: 'open' },
      { id: 'opp_mock_2', name: 'SEO Retainer', monetaryValue: 1200, pipelineId: 'pipe_mock_1', pipelineStageId: 'stage_mock_new', contact: { id: 'cont_mock_2' }, status: 'open' }
    ];
  }

  async get(url) {
    // 1. Simulate 429 Rate Limit
    if (this.simulate429 && this.rateLimitHitCount < 1) {
      this.rateLimitHitCount++;
      const err = new Error('Rate limit exceeded');
      err.status = 429;
      err.retryAfter = 1;
      throw err;
    }

    // 2. Simulate 500 Transient Network Failure
    if (this.simulate500 && this.transientHitCount < 1) {
      this.transientHitCount++;
      const err = new Error('Internal GHL Server Error');
      err.status = 500;
      throw err;
    }

    if (url.includes('/opportunities/pipelines')) {
      return { pipelines: this.mockPipelines };
    }

    if (url.includes('/customFields')) {
      return { customFields: this.mockCustomFields };
    }

    if (url.includes('/contacts/')) {
      // Simulate 2-page pagination if limit=2
      if (url.includes('limit=2')) {
        if (url.includes('startAfter=')) {
          return { contacts: this.mockContacts.slice(2), meta: { total: 3 } };
        }
        return { contacts: this.mockContacts.slice(0, 2), meta: { total: 3, startAfter: 'cont_mock_2' } };
      }
      return { contacts: this.mockContacts, meta: { total: this.mockContacts.length } };
    }

    if (url.includes('/opportunities/search')) {
      return { opportunities: this.mockOpportunities };
    }

    return {};
  }

  async post(url, data) {
    if (url.includes('/contacts/')) {
      const newId = `cont_mock_${Date.now()}`;
      return { contact: { id: newId, ...data } };
    }
    if (url.includes('/opportunities/')) {
      const newId = `opp_mock_${Date.now()}`;
      return { opportunity: { id: newId, ...data } };
    }
    if (url.includes('/customFields')) {
      const newId = `cf_mock_${Date.now()}`;
      return { customField: { id: newId, ...data } };
    }
    return { id: `mock_${Date.now()}` };
  }

  async put(url, data) {
    return { success: true, updated: true };
  }
}

export default GhlMockClient;
