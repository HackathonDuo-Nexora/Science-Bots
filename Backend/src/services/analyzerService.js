/**
 * analyzerService.js
 *
 * Real AI-powered Analyzer Agent for Science Bots.
 * Powered by Google Gemini 3.8 Flash.
 *
 * Evaluates whether extracted research claims are supported, conflicting,
 * or insufficient based strictly on retrieved scholarly sources.
 *
 * Grounding Rule:
 *   The Analyzer may ONLY use evidence directly supplied in the provided sources.
 *   Outside knowledge and hallucinated citations are strictly prohibited.
 */

import { isSourceRelevant } from './research/realResearchProvider.js';

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Remove any API keys or secrets from error messages before logging or throwing.
 */
function sanitizeErrorMessage(msg, apiKey) {
  if (!msg || typeof msg !== 'string') return 'Unknown error';
  let clean = msg;
  if (apiKey) {
    clean = clean.replaceAll(apiKey, '[REDACTED]');
  }
  clean = clean.replace(/key=[a-zA-Z0-9_\-]+/g, 'key=[REDACTED]');
  return clean;
}

/**
 * Fetch with automatic retry for transient errors (429, 500, 503) and 12s timeout.
 */
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if ((res.status === 503 || res.status === 429 || res.status === 500) && attempt <= maxRetries) {
        console.warn(`[AnalyzerService] Gemini returned HTTP ${res.status} (attempt ${attempt}). Retrying in 1.5s...`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt <= maxRetries) {
        console.warn(`[AnalyzerService] Network/timeout error (attempt ${attempt}): ${err.message}. Retrying in 1.5s...`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Format minimal, relevant source metadata for Gemini prompt grounding.
 */
function prepareSourcePayload(sources) {
  return sources.map((s) => ({
    id:         s.id,
    title:      s.title,
    url:        s.url,
    domain:     s.domain,
    year:       s.year ?? 'Recent',
    sourceType: s.sourceType ?? 'academic',
    relevance:  s.relevance ?? 0.8,
    snippet:    s.snippet ?? '',
  }));
}

/**
 * Format minimal claim payload for Gemini prompt.
 */
function prepareClaimPayload(claims) {
  return claims.map((c) => ({
    id:          c.id,
    text:        c.text,
    sourceIds:   c.sourceIds ?? [],
    evidenceIds: c.evidenceIds ?? [],
  }));
}

/**
 * Validate and repair model output against strict grounding and evidence rules.
 */
function validateAndRepairResults(rawResults, claims, sources, topic = '') {
  const validSourceMap = new Map(sources.map((s) => [s.id, s]));
  const validClaimMap  = new Map(claims.map((c) => [c.id, c]));
  const evaluatedMap   = new Map();

  const allowedStatuses = new Set(['supported', 'conflict', 'insufficient']);

  if (Array.isArray(rawResults)) {
    for (const item of rawResults) {
      if (!item || typeof item !== 'object' || !item.claimId) continue;

      const claimId = String(item.claimId);
      const originalClaim = validClaimMap.get(claimId);
      if (!originalClaim) continue; // Reject unknown claims

      // Validate & clean status
      let status = String(item.status || 'insufficient').toLowerCase().trim();
      if (!allowedStatuses.has(status)) {
        status = 'insufficient';
      }

      // Filter sourceIds strictly to known source IDs from input AND check topic relevance
      const rawSourceIds = Array.isArray(item.sourceIds) ? item.sourceIds : [];
      const cleanSourceIds = rawSourceIds
        .map(String)
        .filter((id) => {
          const src = validSourceMap.get(id);
          if (!src) return false;
          // Topic relevance check: Reject sources that are unrelated to the research topic
          if (topic && typeof isSourceRelevant === 'function') {
            if (!isSourceRelevant(topic, src.title, src.snippet)) {
              return false;
            }
          }
          return true;
        });

      // Filter evidenceIds
      const validClaimEvidenceIds = new Set(originalClaim.evidenceIds || []);
      const rawEvidenceIds = Array.isArray(item.evidenceIds) ? item.evidenceIds : [];
      let cleanEvidenceIds = rawEvidenceIds
        .map(String)
        .filter((id) => validClaimEvidenceIds.has(id));

      // If model omitted evidenceIds but cited valid relevant sources that have evidence
      if (cleanEvidenceIds.length === 0 && cleanSourceIds.length > 0) {
        if (originalClaim.evidenceIds && originalClaim.evidenceIds.length > 0) {
          cleanEvidenceIds = [...originalClaim.evidenceIds];
        } else if (originalClaim.evidenceIds === undefined) {
          // Backward-compatible for claims where evidenceIds field is not defined
          cleanEvidenceIds = cleanSourceIds.map((id) => `ev_${id}`);
        }
      }

      // Confidence clamp: float between 0.0 and 1.0
      let confidence = parseFloat(item.confidence);
      if (Number.isNaN(confidence) || confidence < 0) confidence = 0.5;
      if (confidence > 1.0) confidence = 1.0;
      confidence = Math.round(confidence * 100) / 100;

      // STRICT GROUNDING INVARIANTS:
      // A claim can ONLY be marked 'supported' when:
      // 1. cleanSourceIds has at least 1 verified, relevant source
      // 2. cleanEvidenceIds has at least 1 verified evidence item (>0 evidence)
      // 3. confidence >= 0.60
      if (status === 'supported') {
        if (cleanSourceIds.length === 0 || cleanEvidenceIds.length === 0 || confidence < 0.60) {
          status = 'insufficient';
          cleanEvidenceIds = [];
          confidence = Math.min(confidence, 0.45);
        }
      }

      // Summary cleaning: short high-level explanation, no chain-of-thought
      let summary = typeof item.summary === 'string' ? item.summary.trim() : '';
      if (!summary) {
        summary = status === 'supported'
          ? 'Direct empirical evidence supports the claim.'
          : status === 'conflict'
          ? 'Conflicting evidence identified across sources.'
          : 'Evidence is insufficient, empty, or unverified in retrieved sources.';
      } else if (status === 'insufficient' && !summary.toLowerCase().includes('insufficient')) {
        summary = `Insufficient evidence: ${summary}`;
      }
      if (summary.length > 250) {
        summary = `${summary.substring(0, 247)}...`;
      }

      evaluatedMap.set(claimId, {
        claimId,
        status,
        confidence,
        sourceIds:   cleanSourceIds,
        evidenceIds: cleanEvidenceIds,
        summary,
      });
    }
  }

  // Ensure EVERY input claim has an evaluation (repair missing claims)
  return claims.map((c) => {
    if (evaluatedMap.has(c.id)) {
      return evaluatedMap.get(c.id);
    }

    // Fallback for omitted claim
    const fallbackSourceIds = (c.sourceIds || []).filter((id) => validSourceMap.has(id));
    return {
      claimId:     c.id,
      status:      'insufficient',
      confidence:  0.30,
      sourceIds:   fallbackSourceIds,
      evidenceIds: [],
      summary:     'Insufficient direct evidence substantiating this claim.',
    };
  });
}

/**
 * Fallback heuristic evaluation used only if Gemini API is unreachable.
 * Never marks supported without valid evidence and relevant sources.
 */
function fallbackHeuristicEvaluation(claims, sources, topic = '') {
  const validSourceMap = new Map(sources.map((s) => [s.id, s]));

  return claims.map((c) => {
    const matchingIds = (c.sourceIds || []).filter((id) => {
      const src = validSourceMap.get(id);
      if (!src) return false;
      if (topic && typeof isSourceRelevant === 'function') {
        return isSourceRelevant(topic, src.title, src.snippet);
      }
      return true;
    });

    const hasEvidence = matchingIds.length > 0 && Array.isArray(c.evidenceIds) && c.evidenceIds.length > 0;
    const isSupported = hasEvidence && matchingIds.length > 0;

    return {
      claimId:     c.id,
      status:      isSupported ? 'supported' : 'insufficient',
      confidence:  isSupported ? 0.70 : 0.30,
      sourceIds:   matchingIds,
      evidenceIds: isSupported ? c.evidenceIds : [],
      summary:     isSupported
        ? 'Direct empirical evidence support verified.'
        : 'Evidence is insufficient or lacking direct supporting citations.',
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze research claims against retrieved sources using Gemini 3.8 Flash.
 *
 * @param {object}   opts
 * @param {string}   opts.topic   - Research topic
 * @param {object[]} opts.claims  - Array of extracted claims
 * @param {object[]} opts.sources - Array of normalized sources
 * @returns {Promise<object[]>} Array of validated claim evaluation objects
 */
export async function analyzeClaims({ topic, claims = [], sources = [] }) {
  if (!claims || claims.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Real research analyzer requires a valid Gemini API key.');
  }

  const cleanSources = prepareSourcePayload(sources);
  const cleanClaims  = prepareClaimPayload(claims);

  const systemInstruction = `You are the Analyzer Agent in Science Bots, an autonomous scholarly research team.
Your task is to evaluate research claims strictly against the provided sources.

STRICT GROUNDING & VERIFICATION RULES:
1. TOPIC RELEVANCE: Evidence must directly support the claim within the scope of Research Topic: "${topic}".
   Reject unrelated sources even if their titles or text contain generic AI terminology (e.g. finance, banking, economics when the topic is medical diagnosis).
2. DIRECT EVIDENCE REQUIRED: Only mark a claim "supported" if the provided source text explicitly and directly substantiates the claim with empirical or theoretical evidence.
3. INSUFFICIENT EVIDENCE: If evidence is missing, empty, generic, indirect, irrelevant, or inconclusive, you MUST classify the claim as "insufficient".
4. CONFLICT: If credible sources directly contradict each other or the claim, classify the claim as "conflict".
5. Every "supported" claim MUST cite the supporting "sourceIds" AND include supporting "evidenceIds" from the provided input claims. If evidence is empty, status MUST NOT be "supported".
6. Do NOT fabricate outside facts, evidence, or citations. Ground evaluation exclusively on the provided text.
7. Confidence must be between 0.0 and 1.0. Do not assign confidence >= 0.8 without strong direct evidence.
8. "summary" must be a concise (1-2 sentences) high-level evidence assessment.

Output MUST be a JSON array of objects conforming to:
[
  {
    "claimId": "string",
    "status": "supported" | "conflict" | "insufficient",
    "confidence": number,
    "sourceIds": ["string"],
    "evidenceIds": ["string"],
    "summary": "string"
  }
]`;

  const userPrompt = `Research Topic: ${topic}

Available Sources:
${JSON.stringify(cleanSources, null, 2)}

Claims to Evaluate:
${JSON.stringify(cleanClaims, null, 2)}

Evaluate each claim against the sources according to the grounding rules and return the JSON array.`;

function getCandidateModels() {
  const configured = (process.env.GEMINI_MODEL || '').trim();
  const defaults = [
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
  ];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

  const candidateModels = getCandidateModels();
  let lastError = null;

  for (const model of candidateModels) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetchWithRetry(
        url,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature:      0.1,
            },
          }),
        },
        1
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const isTransientOrQuota = res.status === 429 || res.status === 404 || res.status === 503 || res.status === 500;
        if (isTransientOrQuota && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`[AnalyzerService] Model ${model} returned HTTP ${res.status}. Attempting fallback candidate model...`);
          lastError = new Error(`Gemini API HTTP ${res.status}: ${errText.substring(0, 200)}`);
          continue;
        }
        throw new Error(`Gemini API HTTP ${res.status}: ${errText.substring(0, 200)}`);
      }

      const data = await res.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawContent) {
        throw new Error('Gemini response candidate content was empty.');
      }

      const parsed = JSON.parse(rawContent);
      return validateAndRepairResults(parsed, claims, sources, topic);
    } catch (err) {
      lastError = err;
      if (candidateModels.indexOf(model) < candidateModels.length - 1) {
        console.warn(`[AnalyzerService] Model ${model} failed: ${sanitizeErrorMessage(err.message, apiKey)}. Trying next candidate model...`);
        continue;
      }
    }
  }

  const cleanMsg = sanitizeErrorMessage(lastError?.message || 'All candidate Gemini models failed', apiKey);
  console.error(`[AnalyzerService] Real Gemini analysis failed: ${cleanMsg}`);
  throw new Error(`Gemini Analyzer failed: ${cleanMsg}`);
}

export { validateAndRepairResults, sanitizeErrorMessage, fallbackHeuristicEvaluation };
