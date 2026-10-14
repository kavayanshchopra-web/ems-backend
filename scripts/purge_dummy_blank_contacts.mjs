import { SupabaseSandboxService, SUPABASE_URL, getHeaders } from '../frontend/src/core/services/supabaseSandboxService.js';

async function purgeDummyContacts() {
  console.log('Fetching all contacts for Tenant 1...');
  const contacts = await SupabaseSandboxService.fetchContacts(1);
  console.log(`Fetched ${contacts.length} total contacts.`);

  const dummyRecords = contacts.filter(c => {
    const cleanDigits = (c.phone || '').replace(/\D/g, '');
    const hasPhone = cleanDigits.length >= 7;
    const hasEmail = c.email && c.email.trim().includes('@');
    const isGenericName = ['lead', 'new lead', 'crm lead', 'highlevel lead', 'untitled contact'].includes((c.name || '').trim().toLowerCase());
    return !hasPhone && !hasEmail && isGenericName;
  });

  console.log(`Found ${dummyRecords.length} blank dummy contacts with no phone, no email, and generic name.`);

  if (dummyRecords.length === 0) {
    console.log('No dummy contacts to purge.');
    return;
  }

  const idsToDelete = dummyRecords.map(c => c.id).filter(Boolean);
  console.log(`Proceeding to delete ${idsToDelete.length} dummy contacts from Supabase PostgreSQL (${SUPABASE_URL})...`);

  const chunkSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const inFilter = `(${chunk.map(id => `"${id}"`).join(',')})`;
    const url = `${SUPABASE_URL}/contacts?id=in.${encodeURIComponent(inFilter)}&tenant_id=eq.1`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (res.ok) {
      deletedCount += chunk.length;
      process.stdout.write(`Purged ${deletedCount} / ${idsToDelete.length}\r`);
    } else {
      console.error(`\nBatch error at offset ${i}:`, res.status, await res.text());
    }
  }

  console.log(`\n✅ Purge complete! Total deleted: ${deletedCount}`);

  const remaining = await SupabaseSandboxService.fetchContacts(1);
  console.log(`📊 Clean real contacts remaining in Supabase for Tenant 1: ${remaining.length}`);
}

purgeDummyContacts().catch(console.error);
