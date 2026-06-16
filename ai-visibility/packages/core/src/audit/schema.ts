// schema.org audit — does the page expose structured data AI can ingest? (§5)
// Detects JSON-LD Product / LocalBusiness, and can emit a corrected block.
// Runtime-agnostic (§0): regex-based extraction, no DOM parser, no Node APIs.

import type { Business } from '../detection/types';

export interface SchemaAudit {
  types: string[]; // every @type found in JSON-LD on the page
  hasProduct: boolean;
  hasLocalBusiness: boolean;
}

// LocalBusiness has many subtypes; treat any *Business or known local types as local.
const LOCAL_BUSINESS_TYPES = /business$|^store$|^restaurant$|^dentist$|^medicalclinic$/i;

const JSONLD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Scan page HTML for JSON-LD and report which schema types are present. */
export function detectSchema(html: string): SchemaAudit {
  const types = new Set<string>();
  for (const match of html.matchAll(JSONLD_BLOCK)) {
    const block = match[1];
    if (!block) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.trim());
    } catch {
      continue; // skip malformed blocks rather than failing the whole audit
    }
    collectTypes(parsed, types);
  }

  const list = [...types];
  return {
    types: list,
    hasProduct: list.some((t) => t.toLowerCase() === 'product'),
    hasLocalBusiness: list.some((t) => LOCAL_BUSINESS_TYPES.test(t)),
  };
}

/** Walk a JSON-LD value (object, array, or @graph) collecting every @type. */
function collectTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  const t = obj['@type'];
  if (typeof t === 'string') out.add(t);
  else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') out.add(v);

  if (Array.isArray(obj['@graph'])) collectTypes(obj['@graph'], out);
}

/** Generate a correct LocalBusiness JSON-LD block for a business (the suggested fix). */
export function generateLocalBusinessSchema(business: Business): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
  };
  if (business.website) data['url'] = ensureHttps(business.website);
  if (business.city) data['address'] = { '@type': 'PostalAddress', addressLocality: business.city };

  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

function ensureHttps(site: string): string {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}
