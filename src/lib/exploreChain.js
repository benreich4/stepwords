/** Stepword chain helpers for the Explore page (each step removes one letter). */

export const MIN_WORD_LEN = 3;
export const MAX_WORD_LEN = 15;

function sortedKey(word) {
  return word.split("").sort().join("");
}

/** Words one letter shorter that are valid step predecessors. */
export function findSubWords(word, wordDict) {
  if (!word || word.length <= MIN_WORD_LEN) return [];
  const results = new Set();
  for (let i = 0; i < word.length; i++) {
    const option = word.slice(0, i) + word.slice(i + 1);
    const matches = wordDict[sortedKey(option)];
    if (matches) matches.forEach((w) => results.add(w));
  }
  return [...results];
}

/** Words one letter longer that are valid step successors. */
export function findAddWords(word, wordDict) {
  if (!word || word.length >= MAX_WORD_LEN) return [];
  const results = new Set();
  for (const c of "abcdefghijklmnopqrstuvwxyz") {
    const matches = wordDict[sortedKey(word + c)];
    if (matches) matches.forEach((w) => results.add(w));
  }
  return [...results];
}

/** Longest descending chain starting at `word` (memoized DFS). */
export function maxChainLengthDown(word, wordDict, memo = new Map()) {
  if (!word) return 0;
  if (memo.has(word)) return memo.get(word);
  if (word.length <= MIN_WORD_LEN) {
    memo.set(word, 1);
    return 1;
  }

  let best = 1;
  for (const sub of findSubWords(word, wordDict)) {
    best = Math.max(best, 1 + maxChainLengthDown(sub, wordDict, memo));
  }
  memo.set(word, best);
  return best;
}

/** Build a random descending chain of exactly `targetLength` words from `startWord`. */
export function buildRandomChainDown(startWord, targetLength, wordDict, memo = new Map()) {
  const targetLen = Math.max(1, targetLength);
  if (!startWord) return null;
  if (targetLen === 1) return [startWord];

  const chain = [startWord];
  let current = startWord;

  while (chain.length < targetLen) {
    const remaining = targetLen - chain.length;
    const subs = findSubWords(current, wordDict).filter(
      (w) => !chain.includes(w) && maxChainLengthDown(w, wordDict, memo) >= remaining
    );
    if (subs.length === 0) return null;
    const next = subs[Math.floor(Math.random() * subs.length)];
    chain.push(next);
    current = next;
  }

  return chain;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Find a random chain of `chainLength` words starting at length `startLength`.
 * Returns words longest → shortest (Explore navigation order), or null.
 */
export function suggestRandomChain(
  wordList,
  wordDict,
  startLength,
  chainLength,
  { maxAttempts = 2500 } = {}
) {
  const targetLen = Math.max(1, chainLength);
  const endLength = startLength - targetLen + 1;
  if (endLength < MIN_WORD_LEN) return null;

  const candidates = wordList.filter((w) => w.length === startLength);
  if (candidates.length === 0) return null;

  shuffleInPlace(candidates);
  const memo = new Map();
  const attempts = Math.min(maxAttempts, candidates.length);

  for (let i = 0; i < attempts; i++) {
    const start = candidates[i];
    if (maxChainLengthDown(start, wordDict, memo) < targetLen) continue;
    const chain = buildRandomChainDown(start, targetLen, wordDict, memo);
    if (chain) return chain;
  }

  return null;
}
