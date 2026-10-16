/**
 * dealSanitizer.js
 * Comprehensive Validator & Purger for Fake / Ghost CRM Deals
 * Ensures CRM pipelines, summary counters, and lists exclusively display authentic customer leads.
 */

export const isGhostCrmDeal = (deal) => {
  if (!deal || typeof deal !== 'object') return true;

  // Extract phone number digits
  const rawPhone = String(
    deal.phone ||
    deal.phoneNumber ||
    deal.phone_number ||
    deal.mobile ||
    deal.customer_phone ||
    deal.customerPhone ||
    deal.contact_phone ||
    deal.contactPhone ||
    ''
  ).replace(/\D/g, '');

  // Extract email address
  const rawEmail = String(
    deal.email ||
    deal.customer_email ||
    deal.customerEmail ||
    deal.contact_email ||
    deal.contactEmail ||
    ''
  ).trim().toLowerCase();

  const hasValidPhone = rawPhone.length >= 7;
  const hasValidEmail = rawEmail.includes('@') && rawEmail.includes('.') && !rawEmail.includes('example.com') && !rawEmail.includes('company.com');

  // If deal has NEITHER real phone nor real email, it is an empty ghost/dummy deal
  if (!hasValidPhone && !hasValidEmail) {
    const rawTitle = String(deal.title || deal.name || '').trim().toLowerCase();
    const rawCustomer = String(deal.customer_name || deal.customerName || deal.contact || deal.contact_name || deal.contactName || '').trim().toLowerCase();
    const rawNotes = String(deal.notes || '').toLowerCase();
    const rawId = String(deal.id || deal._id || '').toLowerCase();

    if (
      !rawTitle ||
      rawTitle === 'crm lead' ||
      rawTitle === 'crm lead - crm lead' ||
      rawTitle.includes('crm lead - crm lead') ||
      rawTitle.includes('crm lead') ||
      rawTitle.includes('ghl lead') ||
      rawTitle === 'sales deal' ||
      rawTitle === 'deal' ||
      rawTitle === 'lead' ||
      rawTitle === 'new lead' ||
      rawCustomer === 'crm lead' ||
      rawCustomer === 'lead' ||
      rawCustomer === 'contact' ||
      !rawCustomer ||
      rawNotes.includes('live inbound sync from crm') ||
      rawNotes.includes('imported from crm') ||
      rawNotes.includes('imported from gohighlevel') ||
      rawId.startsWith('deal_ghl_') ||
      rawId.startsWith('deal_') ||
      rawId.startsWith('ghl_')
    ) {
      return true;
    }
  }

  // Check known mock/test data identifiers
  const s = (typeof deal === 'string' ? deal : JSON.stringify(deal)).toLowerCase();
  if (
    s.includes('rahul.sharma') ||
    s.includes('priya.v@company.com') ||
    s.includes('amit.k@company.com') ||
    s.includes('suman.shine') ||
    s.includes('hiranur') ||
    s.includes('luiza') ||
    s.includes('soundhelix.com') ||
    s.includes('live sim call lead')
  ) {
    return true;
  }

  return false;
};

export const sanitizeCrmDeals = (dealsList = []) => {
  if (!Array.isArray(dealsList)) return [];
  return dealsList.filter(d => !isGhostCrmDeal(d));
};

export default {
  isGhostCrmDeal,
  sanitizeCrmDeals
};
