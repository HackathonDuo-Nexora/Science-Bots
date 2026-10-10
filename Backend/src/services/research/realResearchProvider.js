/**
 * realResearchProvider.js
 *
 * Real research provider using the OpenAlex scholarly works API.
 *
 * OpenAlex is a free, open catalog of 250M+ scholarly records worldwide.
 * It provides real academic paper metadata, DOIs, abstracts, and authors
 * with no mandatory API key required.
 *
 * Supports:
 *   - Automatic deduplication of URLs across passes
 *   - URL normalization (stripping tracking query params, trailing slashes)
 *   - Abstract extraction from inverted index
 *   - Source categorization (academic, government, technical, news, general)
 *   - Lightweight keyword/topic relevance scoring (0.0 to 1.0)
 *   - Initial pending claim extraction linked to source IDs
 *
 * Interface:
 *   search({ topic, existingSources, pass }) → Promise<{ sources: [], claims: [] }>
 */

import crypto from 'crypto';

// ─── Stop Words for Relevance Scoring ─────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'about', 'into', 'over', 'via',
  'using', 'toward', 'towards', 'through', 'under'
]);

// ─── Normalization & Parsing Helpers ─────────────────────────────────────────

/**
 * Normalize a URL for safe comparison and storage.
 * Strips hash, trailing slashes, and common tracking query parameters.
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';
    // Strip common tracking and referrer query parameters
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|ref|source|fbclid|gclid|origin)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.trim().replace(/\/$/, '');
  }
}

/**
 * Extract root domain from URL without 'www.' prefix.
 */
export function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unknown';
  }
}

/**
 * Reconstruct text from OpenAlex abstract_inverted_index.
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(' ');
}

/**
 * Determine source type based on domain and publication metadata.
 * Categories: academic | government | official | technical | news | general
 */
function determineSourceType(item, domain) {
  const domainLower = domain.toLowerCase();
  const typeLower   = (item.type || '').toLowerCase();

  if (domainLower.endsWith('.gov') || domainLower.includes('.gov.') || domainLower.endsWith('.mil')) {
    return 'government';
  }
  if (domainLower.includes('news') || domainLower.includes('reuters') || domainLower.includes('bbc') || domainLower.includes('bloomberg')) {
    return 'news';
  }
  if (typeLower.includes('report') || typeLower.includes('dataset') || typeLower.includes('standard')) {
    return 'technical';
  }
  if (
    typeLower.includes('article') ||
    typeLower.includes('conference') ||
    typeLower.includes('book') ||
    typeLower.includes('dissertation') ||
    typeLower.includes('preprint') ||
    domainLower.includes('doi.org') ||
    domainLower.includes('arxiv.org') ||
    domainLower.endsWith('.edu') ||
    domainLower.includes('sciencedirect') ||
    domainLower.includes('springer') ||
    domainLower.includes('ieee') ||
    domainLower.includes('nature') ||
    domainLower.includes('wiley')
  ) {
    return 'academic';
  }

  return 'academic';
}

const GENERIC_AI_TERMS = new Set([
  'ai', 'artificial', 'intelligence', 'agent', 'agents', 'agentic',
  'model', 'models', 'system', 'systems', 'learning', 'machine',
  'algorithm', 'algorithms', 'deep', 'neural', 'framework', 'frameworks',
  'study', 'analysis', 'empirical', 'paper', 'literature', 'review',
  'approach', 'methods', 'methodology', 'evaluation', 'performance', 'benchmark'
]);

// Contrast domains to detect blatant subject-matter mismatches
const CONTRASTING_DOMAINS = [
  { domain: 'finance', keywords: ['finance', 'financial', 'banking', 'market', 'markets', 'stock', 'stocks', 'portfolio', 'asset', 'assets', 'trading', 'cryptocurrency', 'bitcoin', 'blockchain', 'macroeconomic', 'fiscal'] },
  { domain: 'medical', keywords: ['medical', 'medicine', 'diagnosis', 'diagnostic', 'clinical', 'patient', 'patients', 'healthcare', 'disease', 'diseases', 'therapy', 'hospital', 'pathology', 'radiology', 'oncology', 'physician', 'biomedical'] },
  { domain: 'quantum', keywords: ['quantum', 'qubit', 'qubits', 'entanglement', 'superposition', 'coherence'] },
  { domain: 'astronomy', keywords: ['galaxy', 'galaxies', 'stellar', 'cosmology', 'telescope', 'astronomical', 'planetary', 'astrophysics'] },
  { domain: 'agriculture', keywords: ['crop', 'crops', 'farming', 'agricultural', 'soil', 'irrigation', 'yield', 'harvest'] },
];

/**
 * Check whether a source is relevant to the topic or discusses an unrelated domain.
 */
export function isSourceRelevant(topic, title, snippet) {
  const score = calculateRelevance(topic, title, snippet);
  return score >= 0.45;
}

function textMatchesKeyword(text, kw) {
  if (!text || !kw) return false;
  if (text.includes(kw)) return true;
  if (kw.length >= 5) {
    const prefix = kw.substring(0, Math.min(kw.length - 1, 6));
    if (text.includes(prefix)) return true;
  }
  return false;
}

/**
 * Rigorous relevance calculation (0.0 to 1.0) based on domain-specific topic keywords.
 */
export function calculateRelevance(topic, title, snippet) {
  if (!topic || typeof topic !== 'string' || !topic.trim()) return 0.0;

  const topicWords = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (topicWords.length === 0) return 0.0;

  const domainKeywords = topicWords.filter((w) => !GENERIC_AI_TERMS.has(w));
  const titleLower   = (title || '').toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();
  const combinedText = `${titleLower} ${snippetLower}`;

  // Domain mismatch detection
  for (const group of CONTRASTING_DOMAINS) {
    const topicHasDomain = group.keywords.some((kw) => topic.toLowerCase().includes(kw));
    if (topicHasDomain) {
      // Find if paper belongs to an opposing domain without matching current domain
      for (const otherGroup of CONTRASTING_DOMAINS) {
        if (otherGroup.domain === group.domain) continue;
        const paperHasOtherDomain = otherGroup.keywords.some((kw) => combinedText.includes(kw));
        const paperHasCurrentDomain = group.keywords.some((kw) => combinedText.includes(kw));
        if (paperHasOtherDomain && !paperHasCurrentDomain) {
          // Blatant domain mismatch (e.g. Finance paper when query is Medical)
          return 0.0;
        }
      }
    }
  }

  // If topic has domain-specific keywords (e.g. medical, diagnosis), candidate MUST match at least one
  if (domainKeywords.length > 0) {
    const matchesDomain = domainKeywords.some(
      (kw) => textMatchesKeyword(titleLower, kw) || textMatchesKeyword(snippetLower, kw)
    );
    if (!matchesDomain) {
      // Only generic AI terms matched; reject as unrelated
      return 0.15;
    }
  }

  let domainMatches = 0;
  for (const kw of domainKeywords) {
    if (textMatchesKeyword(titleLower, kw)) domainMatches += 3;
    else if (textMatchesKeyword(snippetLower, kw)) domainMatches += 2;
  }

  let otherMatches = 0;
  for (const kw of topicWords) {
    if (!domainKeywords.includes(kw)) {
      if (textMatchesKeyword(titleLower, kw)) otherMatches += 1;
      else if (textMatchesKeyword(snippetLower, kw)) otherMatches += 0.5;
    }
  }

  // Matching a domain keyword establishes clear relevance
  const domainRatio = domainKeywords.length > 0
    ? Math.min(1.0, domainMatches / 3.0)
    : 1.0;
  const otherRatio = topicWords.length > domainKeywords.length
    ? Math.min(1.0, otherMatches / Math.max(1, (topicWords.length - domainKeywords.length)))
    : 1.0;

  const finalScore = domainKeywords.length > 0
    ? domainRatio * 0.70 + otherRatio * 0.30
    : otherRatio;

  return Math.round(Math.min(1.0, Math.max(0.0, finalScore)) * 100) / 100;
}

/**
 * Extract initial pending claims from real source snippets.
 * Each claim references an existing source ID and real extracted evidence excerpt.
 */
function extractClaims(sources, topic, pass = 'initial') {
  const claims = [];

  for (const source of sources.slice(0, 2)) {
    let claimText = '';
    let hasSubstantiveEvidence = false;

    if (source.snippet && source.snippet.length > 40) {
      const sentences = source.snippet
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) =>
          s.length >= 35 &&
          s.length <= 180 &&
          !/^(purpose|background|methodology|methods|conclusion|results|abstract):/i.test(s)
        );

      if (sentences.length > 0) {
        claimText = sentences[0];
        hasSubstantiveEvidence = true;
      }
    }

    if (!claimText) {
      claimText = `Scholarly literature in "${source.title}" evaluates core methodological aspects of ${topic}.`;
      hasSubstantiveEvidence = false;
    }

    const evidenceId = hasSubstantiveEvidence
      ? `ev_${source.id.replace('src_', '')}`
      : null;

    const evidenceList = hasSubstantiveEvidence
      ? [
          {
            id: evidenceId,
            sourceId: source.id,
            text: claimText,
            excerpt: claimText,
          },
        ]
      : [];

    claims.push({
      id:          `claim_${crypto.randomUUID().replace(/-/g, '')}`,
      text:        claimText,
      status:      'pending',
      sourceIds:   [source.id],
      evidenceIds: evidenceId ? [evidenceId] : [],
      evidence:    evidenceList,
    });
  }

  // Formulate an exploratory gap claim on initial pass that requires broader empirical cross-validation
  if (pass === 'initial' && sources.length >= 2) {
    claims.push({
      id:          `claim_${crypto.randomUUID().replace(/-/g, '')}`,
      text:        `Empirical multi-site evaluation is required to evaluate consistency and boundary conditions for "${topic}".`,
      status:      'pending',
      sourceIds:   [],
      evidenceIds: [],
      evidence:    [],
    });
  }

  return claims;
}

/**
 * Fetch OpenAlex with automatic retry for transient errors (429, 500, 503),
 * respecting Retry-After headers, bounded exponential backoff with jitter, and 20s timeout.
 */
export async function fetchOpenAlexWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if ((res.status === 429 || res.status === 500 || res.status === 503) && attempt <= maxRetries) {
        let delayMs = 0;
        const retryAfter = res.headers.get('retry-after') || res.headers.get('Retry-After');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed) && parsed > 0) {
            delayMs = Math.min(parsed * 1000, 8000);
          }
        }
        if (!delayMs) {
          const base = 1500 * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 400;
          delayMs = Math.min(base + jitter, 8000);
        }

        console.warn(`[RealResearchProvider] OpenAlex returned HTTP ${res.status} (attempt ${attempt}). Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        if (attempt <= maxRetries) {
          console.warn(`[RealResearchProvider] OpenAlex timed out (attempt ${attempt}). Retrying...`);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error('OpenAlex search request timed out after 20s.');
      }
      if (attempt <= maxRetries) {
        console.warn(`[RealResearchProvider] Network error (attempt ${attempt}): ${err.message}. Retrying...`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Retrieve scholarly works from OpenAlex.
 */
export async function searchOpenAlex({ topic, existingSources = [], pass = 'initial', targetCount = 6 }) {
  const cleanTopic = topic.trim();
  const searchQuery = pass === 'supplementary'
    ? `${cleanTopic} empirical evidence analysis`
    : cleanTopic;

  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', searchQuery);
  url.searchParams.set('per_page', String(targetCount * 2));

  if (process.env.OPENALEX_API_KEY) {
    url.searchParams.set('api_key', process.env.OPENALEX_API_KEY);
  }

  const contactEmail = process.env.RESEARCH_CONTACT_EMAIL || 'research@sciencebots.org';
  url.searchParams.set('mailto', contactEmail);

  const res = await fetchOpenAlexWithRetry(url.toString(), {
    headers: {
      'User-Agent': `ScienceBots-ResearchAgent/1.0 (mailto:${contactEmail})`,
      'Accept':     'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`OpenAlex API HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const seenUrls = new Set(
    (existingSources || []).map((s) => normalizeUrl(s.url).toLowerCase())
  );
  const sources = [];

  for (const item of data.results || []) {
    if (sources.length >= targetCount) break;

    const rawUrl =
      item.doi ||
      item.primary_location?.landing_page_url ||
      (item.locations && item.locations[0]?.landing_page_url);

    if (!rawUrl) continue;

    const normUrl = normalizeUrl(rawUrl);
    const normKey = normUrl.toLowerCase();
    if (seenUrls.has(normKey)) continue;
    seenUrls.add(normKey);

    const domain = extractDomain(normUrl);
    let snippet = reconstructAbstract(item.abstract_inverted_index);

    if (!snippet) {
      const venue = item.primary_location?.source?.display_name || 'Academic literature';
      snippet = `${item.title}. Published in ${venue} (${item.publication_year || 'Recent'}).`;
    }

    snippet = snippet.replace(/\s+/g, ' ').trim();
    if (snippet.length > 300) {
      snippet = `${snippet.substring(0, 297)}...`;
    }

    const sourceType = determineSourceType(item, domain);
    const relevance  = calculateRelevance(cleanTopic, item.title, snippet);

    if (!isSourceRelevant(cleanTopic, item.title, snippet)) {
      console.log(`[RealResearchProvider] Rejected unrelated OpenAlex source: "${item.title}" (relevance: ${relevance})`);
      continue;
    }

    sources.push({
      id:         `src_${crypto.randomUUID().replace(/-/g, '')}`,
      title:      item.title,
      url:        normUrl,
      domain,
      snippet,
      sourceType,
      relevance,
      demo:       false,
    });
  }

  const claims = extractClaims(sources, cleanTopic, pass);
  return { sources, claims };
}

/**
 * Legitimate alternative scholarly works provider using Crossref's official API.
 * Used when OpenAlex encounters rate limits or service disruptions.
 */
export async function searchCrossref({ topic, existingSources = [], pass = 'initial', targetCount = 6 }) {
  const cleanTopic = topic.trim();
  const searchQuery = pass === 'supplementary'
    ? `${cleanTopic} empirical research findings`
    : cleanTopic;

  const contactEmail = process.env.RESEARCH_CONTACT_EMAIL || 'research@sciencebots.org';
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=${targetCount * 2}&mailto=${encodeURIComponent(contactEmail)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': `ScienceBots-ResearchAgent/1.0 (mailto:${contactEmail})`,
      'Accept':     'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Crossref API HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const items = data.message?.items || [];
  const seenUrls = new Set(
    (existingSources || []).map((s) => normalizeUrl(s.url).toLowerCase())
  );
  const sources = [];

  for (const item of items) {
    if (sources.length >= targetCount) break;

    const title = item.title?.[0];
    if (!title || typeof title !== 'string' || title.trim().length < 5) continue;

    const rawUrl = item.DOI ? `https://doi.org/${item.DOI}` : item.URL;
    if (!rawUrl) continue;

    const normUrl = normalizeUrl(rawUrl);
    const normKey = normUrl.toLowerCase();
    if (seenUrls.has(normKey)) continue;
    seenUrls.add(normKey);

    const domain = extractDomain(normUrl);
    let snippet = '';
    if (item.abstract) {
      snippet = String(item.abstract)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!snippet) {
      const container = item['container-title']?.[0] || 'Peer-reviewed scholarly literature';
      const year = item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || 'Recent';
      snippet = `${title}. Published in ${container} (${year}).`;
    }

    if (snippet.length > 300) {
      snippet = `${snippet.substring(0, 297)}...`;
    }

    const sourceType = determineSourceType(item, domain);
    const relevance  = calculateRelevance(cleanTopic, title, snippet);

    if (!isSourceRelevant(cleanTopic, title, snippet)) {
      console.log(`[RealResearchProvider] Rejected unrelated Crossref source: "${title}" (relevance: ${relevance})`);
      continue;
    }

    sources.push({
      id:         `src_${crypto.randomUUID().replace(/-/g, '')}`,
      title,
      url:        normUrl,
      domain:     domain || 'doi.org',
      snippet,
      sourceType,
      relevance,
      demo:       false,
    });
  }

  const claims = extractClaims(sources, cleanTopic, pass);
  return { sources, claims };
}

// In-flight query deduplication to prevent duplicate concurrent queries
const inflightSearches = new Map();

// ─── Main Provider Interface ──────────────────────────────────────────────────

/**
 * Real research provider querying OpenAlex with automatic fallback to Crossref.
 *
 * @param {object}   opts
 * @param {string}   opts.topic           - Research topic
 * @param {object[]} opts.existingSources - Already collected sources (for dedup)
 * @param {string}   opts.pass            - 'initial' | 'supplementary'
 * @returns {Promise<{ sources: object[], claims: object[] }>}
 */
export async function search({ topic, existingSources = [], pass = 'initial' }) {
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw new Error('Research topic must be a non-empty string.');
  }

  const cleanTopic = topic.trim();
  const targetCount = pass === 'supplementary' ? 2 : 6;
  const inflightKey = `${cleanTopic}::${pass}::${(existingSources || []).length}`;

  if (inflightSearches.has(inflightKey)) {
    return inflightSearches.get(inflightKey);
  }

  const execute = async () => {
    let openAlexErr = null;

    // 1. Primary: Try OpenAlex scholarly API
    try {
      const result = await searchOpenAlex({
        topic: cleanTopic,
        existingSources,
        pass,
        targetCount,
      });

      if (result.sources.length > 0) {
        return result;
      }
    } catch (err) {
      openAlexErr = err;
      console.warn(`[RealResearchProvider] OpenAlex search failed: ${err.message}. Trying Crossref fallback...`);
    }

    // 2. Secondary: If OpenAlex rate-limited (HTTP 429) or failed, fall back to Crossref
    try {
      const crossrefResult = await searchCrossref({
        topic: cleanTopic,
        existingSources,
        pass,
        targetCount,
      });

      if (crossrefResult.sources.length > 0) {
        console.log(`[RealResearchProvider] Crossref successfully retrieved ${crossrefResult.sources.length} scholarly sources for "${cleanTopic}".`);
        return crossrefResult;
      }
    } catch (crossrefErr) {
      console.warn(`[RealResearchProvider] Crossref search failed: ${crossrefErr.message}.`);
      if (openAlexErr) {
        throw new Error(`Real research providers failed: OpenAlex (${openAlexErr.message}) & Crossref (${crossrefErr.message})`);
      }
      throw crossrefErr;
    }

    if (openAlexErr) {
      throw openAlexErr;
    }

    return { sources: [], claims: [] };
  };

  const promise = execute().finally(() => {
    inflightSearches.delete(inflightKey);
  });

  inflightSearches.set(inflightKey, promise);
  return promise;
}
