const path = require('path');
const fs = require('fs');
const filter = require('leo-profanity');

let initialized = false;

function initFilter() {
  if (initialized) return;
  
  let words = [];
  
  // 1. Load local blacklist
  try {
    const blData = require('./blacklist.json');
    words = Object.values(blData).filter(Array.isArray).flat();
  } catch (e) {
    console.error('[Filter] Error requiring blacklist.json:', e);
  }

  // 2. Load naughty-words
  try {
    const esWords = require('naughty-words/es.json');
    const enWords = require('naughty-words/en.json');
    if (Array.isArray(esWords)) words.push(...esWords);
    if (Array.isArray(enWords)) words.push(...enWords);
  } catch (e) {
    console.error('[Filter] Error loading naughty-words:', e);
  }

  // 3. Clean and deduplicate
  const cleanWords = Array.from(
    new Set(
      words
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 1)
    )
  );

  // 4. Load into leo-profanity
  filter.clearList();
  filter.add(cleanWords);
  initialized = true;
  console.log(`[Filter] Bad words database initialized with ${cleanWords.length} terms.`);
}

function cleanText(text) {
  if (!text) return '';
  initFilter();
  
  // Normalization for leetspeak/spacing bypass checks
  const normalized = text.toLowerCase()
    .replace(/\s+/g, '') 
    .replace(/[^\w]/g, '') 
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/2/g, 'do'); 

  const words = filter.list();
  let containsBadWord = false;
  for (const word of words) {
    if (normalized.includes(word)) {
      containsBadWord = true;
      break;
    }
  }

  let cleaned = filter.clean(text);
  if (containsBadWord) {
    // If bad word detected via normalized check, mask the entire phrase to prevent TTS vocalization
    cleaned = '*'.repeat(text.length);
  }
  return cleaned;
}

module.exports = { cleanText, initFilter };
