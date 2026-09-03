/**
 * Introspect both Supabase projects via the PostgREST OpenAPI spec (no pg needed).
 * Prints the table + column inventory of OLD and NEW, and a gap report so we can
 * build a V2 -> V3 field mapping.
 *
 *   node scripts/probe-schema.mjs
 */
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./migrate.local.json', import.meta.url), 'utf8'));

async function inventory(label, url, key) {
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.error(`${label}: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const spec = await res.json();
  const defs = spec.definitions ?? spec.components?.schemas ?? {};
  const tables = {};
  for (const [name, def] of Object.entries(defs)) {
    const props = def.properties ?? {};
    tables[name] = Object.entries(props).map(([col, p]) => {
      const fmt = p.format ? ` (${p.format})` : '';
      const fk = typeof p.description === 'string' && /fk table/i.test(p.description) ? ' [fk]' : '';
      const pk = typeof p.description === 'string' && /primary key/i.test(p.description) ? ' [pk]' : '';
      return `${col}${fmt}${pk}${fk}`;
    });
  }
  return tables;
}

const oldT = await inventory('OLD', cfg.from.url, cfg.from.serviceKey);
const newT = await inventory('NEW', cfg.to.url, cfg.to.serviceKey);

const line = '─'.repeat(72);
console.log(`\n${line}\nOLD PROJECT  ${cfg.from.url}\n${line}`);
for (const [t, cols] of Object.entries(oldT).sort()) {
  console.log(`\n▸ ${t}  (${cols.length} kolom)`);
  console.log('   ' + cols.join('\n   '));
}

console.log(`\n\n${line}\nNEW PROJECT  ${cfg.to.url}\n${line}`);
for (const [t, cols] of Object.entries(newT).sort()) {
  console.log(`\n▸ ${t}  (${cols.length} kolom)`);
}

console.log(`\n\n${line}\nGAP REPORT (per tabel yang ada di keduanya)\n${line}`);
for (const t of Object.keys(newT).sort()) {
  if (!oldT[t]) {
    console.log(`\n▸ ${t}: TIDAK ADA di project lama`);
    continue;
  }
  const oldCols = new Set(oldT[t].map((c) => c.split(' ')[0]));
  const newCols = new Set(newT[t].map((c) => c.split(' ')[0]));
  const missingInNew = [...oldCols].filter((c) => !newCols.has(c));
  const missingInOld = [...newCols].filter((c) => !oldCols.has(c));
  if (!missingInNew.length && !missingInOld.length) {
    console.log(`\n▸ ${t}: ✓ kolom identik`);
  } else {
    console.log(`\n▸ ${t}:`);
    if (missingInNew.length) console.log(`   lama punya, baru tidak : ${missingInNew.join(', ')}`);
    if (missingInOld.length) console.log(`   baru punya, lama tidak : ${missingInOld.join(', ')}`);
  }
}

const onlyOld = Object.keys(oldT).filter((t) => !newT[t]);
if (onlyOld.length) console.log(`\n▸ Tabel hanya di project LAMA: ${onlyOld.join(', ')}`);
