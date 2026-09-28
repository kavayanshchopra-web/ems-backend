/**
 * whatsAppTemplateService.js
 * Multi-tenant WhatsApp Template & Product Catalog Management Service
 * Provides pre-crafted templates, dynamic placeholder interpolation,
 * and 1-click WhatsApp web/app launch.
 */

import TenantStorage from './TenantStorage';

export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    id: 'tpl_intro',
    title: 'Introduction & Greeting',
    category: 'Greeting',
    isDefault: true,
    content: 'Hi {name}! 👋 It was a pleasure connecting with you today from {company_name}. As discussed during our call, I am sharing my direct WhatsApp contact here. Feel free to message me anytime if you have any questions. Best regards, {agent_name}'
  },
  {
    id: 'tpl_crm_starter',
    title: 'Starter CRM & Lead Manager',
    category: 'Product',
    productName: 'Starter CRM',
    isDefault: true,
    content: 'Hi {name}! 🚀 Here are the quick highlights of our Starter CRM Suite: Automated Lead Tracking, Telecaller SIM Tracker, 1-Click WhatsApp, and Daily Analytics. Starting at just ₹999/user/month. Can I arrange a quick 10-minute demo for your team? - {agent_name}, {company_name}'
  },
  {
    id: 'tpl_cloud_telephony',
    title: 'Cloud Telephony & Call Recording',
    category: 'Product',
    productName: 'Cloud Telephony',
    isDefault: true,
    content: 'Hello {name}, sharing details about our 100% compliant SIM Call Recording & Cloud Telephony Suite. Key features: Automatic call recording, zero-delay cloud sync, live agent monitoring, and disposition tracking. Let us know if you would like a trial setup! - {agent_name}, {company_name}'
  },
  {
    id: 'tpl_whatsapp_api',
    title: 'Official WhatsApp Business API',
    category: 'Product',
    productName: 'WhatsApp API',
    isDefault: true,
    content: 'Hi {name}! 💬 With our Official WhatsApp Business API solution, your team can send bulk verified broadcasts, automate chatbots, and handle customer conversations from a unified shared team inbox. Would you like to see a live demo? - {agent_name} ({company_name})'
  },
  {
    id: 'tpl_hrms_payroll',
    title: 'Enterprise HRMS & Auto-Payroll',
    category: 'Product',
    productName: 'HRMS Suite',
    isDefault: true,
    content: 'Dear {name}, here is our Enterprise HRMS & Payroll overview. Manage GPS attendance, biometric sync, automated salary slips, PF/ESI compliance, and staff advances with 1 click. Would tomorrow 3 PM suit you for a walkthrough? - {agent_name}, {company_name}'
  },
  {
    id: 'tpl_brochure',
    title: 'Company Brochure & Pricing Catalog',
    category: 'Brochure',
    isDefault: true,
    content: 'Hello {name}! 📄 As requested, please review our official company brochure and product pricing catalog. Let me know which plan aligns best with your immediate goals so I can prepare a custom discount quote! Warm regards, {agent_name} ({company_name})'
  },
  {
    id: 'tpl_post_call_interested',
    title: 'Post-Call Summary (Interested Lead)',
    category: 'Follow-up',
    isDefault: true,
    content: 'Hi {name}, thank you for your valuable time on our call just now! As agreed, I have noted down your requirements. I will follow up with you at our scheduled time. In the meantime, please save my contact so you can reach me directly anytime. Have a great day! - {agent_name}'
  },
  {
    id: 'tpl_missed_call',
    title: 'Missed Call / Follow-up Later',
    category: 'Follow-up',
    isDefault: true,
    content: 'Hi {name}, I tried calling you from {company_name} regarding your recent inquiry, but couldn\'t reach you. When would be a convenient time for a quick 2-minute chat today or tomorrow? Thanks! - {agent_name}'
  },
  {
    id: 'tpl_meeting_confirm',
    title: 'Demo Meeting Confirmation',
    category: 'Meeting',
    isDefault: true,
    content: 'Hi {name}! 📅 Our product demonstration has been scheduled as discussed. Our team will walk you through live features and answer any specific questions. Looking forward to meeting you! - {agent_name}, {company_name}'
  },
  {
    id: 'tpl_payment_details',
    title: 'Payment Link / Bank Details',
    category: 'Billing',
    isDefault: true,
    content: 'Hello {name}, thank you for confirming your order with {company_name}! 🙏 Please find our payment account details below for instant activation. Once payment is done, kindly share a screenshot here so we can activate your account immediately. Regards, {agent_name}'
  },
  {
    id: 'tpl_special_offer',
    title: 'Special Incentive / Month-End Offer',
    category: 'Offer',
    isDefault: true,
    content: 'Exciting news {name}! 🎉 We have a special month-end incentive with up to 25% discount on our annual plans if registered this week. Let me know if you would like me to lock this exclusive pricing for your business! - {agent_name} ({company_name})'
  },
  {
    id: 'tpl_support_feedback',
    title: 'Customer Feedback & Support',
    category: 'Support',
    isDefault: true,
    content: 'Hi {name}! Hope you are doing well. How was your experience with {company_name}? If you need any assistance or have questions, I am right here to help you anytime. Warm regards, {agent_name}'
  }
];

export const WhatsAppTemplateService = {
  /**
   * Retrieve all templates for a tenant
   */
  getTemplates(companyId) {
    const rawCompanyId = String(companyId || '1');
    const stored = TenantStorage.getItem('whatsapp_templates', rawCompanyId, null);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    // Seed default templates
    this.saveTemplates(rawCompanyId, DEFAULT_WHATSAPP_TEMPLATES);
    return DEFAULT_WHATSAPP_TEMPLATES;
  },

  /**
   * Save templates for a tenant
   */
  saveTemplates(companyId, templates) {
    const rawCompanyId = String(companyId || '1');
    TenantStorage.setItem('whatsapp_templates', templates, rawCompanyId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('whatsapp_templates_updated', {
        detail: { companyId: rawCompanyId, templates }
      }));
    }
  },

  /**
   * Reset to default templates
   */
  resetToDefaults(companyId) {
    this.saveTemplates(companyId, DEFAULT_WHATSAPP_TEMPLATES);
    return DEFAULT_WHATSAPP_TEMPLATES;
  },

  /**
   * Format clean phone number for WhatsApp wa.me
   */
  formatCleanPhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) {
      return `91${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `91${digits.slice(1)}`;
    }
    return digits;
  },

  /**
   * Replace dynamic placeholders in template
   */
  personalizeText(content, params = {}) {
    if (!content) return '';
    const name = params.name || params.customerName || params.customer_name || 'Customer';
    const agentName = params.agentName || params.agent_name || params.userName || 'Executive';
    const companyName = params.companyName || params.company_name || 'Our Company';
    const phone = params.phone || '';
    const date = params.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    let text = content;
    text = text.replace(/\{name\}/gi, name);
    text = text.replace(/\{customer_name\}/gi, name);
    text = text.replace(/\{agent_name\}/gi, agentName);
    text = text.replace(/\{company_name\}/gi, companyName);
    text = text.replace(/\{phone\}/gi, phone);
    text = text.replace(/\{date\}/gi, date);
    return text;
  },

  /**
   * Generate wa.me URL
   */
  generateWhatsAppUrl(phone, text = '') {
    const cleanDigits = this.formatCleanPhone(phone);
    if (!cleanDigits) return '';
    if (!text) return `https://wa.me/${cleanDigits}`;
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
  },

  /**
   * Launch WhatsApp in a new tab/window or app
   */
  openWhatsApp(phone, text = '') {
    const url = this.generateWhatsAppUrl(phone, text);
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  },

  /**
   * Log WhatsApp Sent & Auto-Tag Lead across Phone System, CRM, and Kanban
   */
  logWhatsAppSent({ companyId = '1', phone = '', contactName = 'Customer', template = null, agentName = 'Executive', leadRecord = null }) {
    const rawCompanyId = String(companyId || '1');
    const cleanDigits = this.formatCleanPhone(phone);
    if (!cleanDigits) return null;

    const tagTitle = template?.title || template?.productName || template?.category || 'Quick Message';
    const tag = `WA: ${tagTitle}`;
    const now = new Date();
    const sentAtFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' + now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const tagInfo = {
      tag,
      templateId: template?.id || 'custom',
      templateTitle: tagTitle,
      category: template?.category || 'General',
      productName: template?.productName || '',
      agentName: agentName || 'Executive',
      sentAt: now.toISOString(),
      sentAtFormatted,
      phone: cleanDigits,
      contactName: contactName || 'Customer'
    };

    // 1. Store in TenantStorage under whatsapp_sent_tags
    const currentTagsMap = TenantStorage.getItem('whatsapp_sent_tags', rawCompanyId, {}) || {};
    currentTagsMap[cleanDigits] = tagInfo;
    if (cleanDigits.length > 10) {
      currentTagsMap[cleanDigits.slice(-10)] = tagInfo;
    }
    TenantStorage.setItem('whatsapp_sent_tags', currentTagsMap, rawCompanyId);

    // 2. Update local call_logs in TenantStorage if present
    try {
      const callLogs = TenantStorage.getItem('call_logs', rawCompanyId, []);
      if (Array.isArray(callLogs) && callLogs.length > 0) {
        let changed = false;
        const updatedLogs = callLogs.map(log => {
          const logDigits = this.formatCleanPhone(log.phone || log.customerPhone || log.phoneNumber);
          const isPhoneMatch = logDigits === cleanDigits || (logDigits.length >= 10 && cleanDigits.endsWith(logDigits.slice(-10)));
          const isIdMatch = leadRecord && (log.id === leadRecord.id || log.leadId === leadRecord.id);

          if (isPhoneMatch || isIdMatch) {
            changed = true;
            const existingTags = Array.isArray(log.tags) ? [...log.tags] : (typeof log.tags === 'string' ? log.tags.split(',') : []);
            if (!existingTags.includes(tag)) {
              existingTags.push(tag);
            }
            return {
              ...log,
              tags: existingTags,
              whatsappTag: tagInfo,
              lastWhatsAppSent: tagInfo.sentAt
            };
          }
          return log;
        });

        if (changed) {
          TenantStorage.setItem('call_logs', updatedLogs, rawCompanyId);
        }
      }
    } catch (e) {
      console.warn('Error updating call_logs with whatsapp tag:', e);
    }

    // 3. Dispatch global events for instant reactive UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omniflow:whatsapp_sent', {
        detail: {
          companyId: rawCompanyId,
          phone: cleanDigits,
          tagInfo,
          leadRecord
        }
      }));

      window.dispatchEvent(new CustomEvent('whatsapp_sent_tags_updated', {
        detail: { companyId: rawCompanyId, tagsMap: currentTagsMap }
      }));
    }

    return tagInfo;
  },

  /**
   * Get WhatsApp tag details for a specific phone number
   */
  getWhatsAppTagForPhone(companyId = '1', phone = '') {
    if (!phone) return null;
    const rawCompanyId = String(companyId || '1');
    const cleanDigits = this.formatCleanPhone(phone);
    if (!cleanDigits) return null;

    const tagsMap = TenantStorage.getItem('whatsapp_sent_tags', rawCompanyId, {}) || {};
    if (tagsMap[cleanDigits]) return tagsMap[cleanDigits];
    if (cleanDigits.length > 10 && tagsMap[cleanDigits.slice(-10)]) {
      return tagsMap[cleanDigits.slice(-10)];
    }

    // Also check 10-digit suffix matching across all stored keys
    const last10 = cleanDigits.slice(-10);
    for (const [key, val] of Object.entries(tagsMap)) {
      if (key.endsWith(last10)) return val;
    }

    return null;
  },

  /**
   * Retrieve all WhatsApp tags for a company
   */
  getAllWhatsAppTags(companyId = '1') {
    const rawCompanyId = String(companyId || '1');
    return TenantStorage.getItem('whatsapp_sent_tags', rawCompanyId, {}) || {};
  }
};

export default WhatsAppTemplateService;

