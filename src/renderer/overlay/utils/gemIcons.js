/**
 * Generates an SVG representation of a Gem based on the tier and accent colors.
 */
export function getGemSVG(tier = 1, primaryColor = '#4facfe', secondaryColor = '#00f2fe') {
  let paths = '';
  if (tier === 1) {
    paths = `<polygon points="12,2 22,20 2,20" fill="url(#gem-grad)"/><polygon points="12,2 12,20 2,20" fill="rgba(255,255,255,0.3)"/>`;
  } else if (tier === 2) {
    paths = `<polygon points="12,2 20,12 12,22 4,12" fill="url(#gem-grad)"/><polygon points="12,2 12,22 4,12" fill="rgba(255,255,255,0.3)"/>`;
  } else if (tier === 3) {
    paths = `<polygon points="12,2 20,6 20,18 12,22 4,18 4,6" fill="url(#gem-grad)"/><polygon points="12,2 20,6 12,12 4,6" fill="rgba(255,255,255,0.4)"/><polygon points="12,12 20,6 20,18 12,22" fill="rgba(0,0,0,0.1)"/><polygon points="4,6 12,12 12,22 4,18" fill="rgba(255,255,255,0.2)"/>`;
  } else if (tier === 4) {
    paths = `<polygon points="12,22 22,8 18,2 6,2 2,8" fill="url(#gem-grad)"/><polygon points="6,2 18,2 12,8" fill="rgba(255,255,255,0.5)"/><polygon points="2,8 12,8 6,2" fill="rgba(255,255,255,0.3)"/><polygon points="22,8 12,8 18,2" fill="rgba(255,255,255,0.1)"/><polygon points="12,22 2,8 12,8" fill="rgba(255,255,255,0.2)"/><polygon points="12,22 22,8 12,8" fill="rgba(0,0,0,0.15)"/>`;
  } else {
    paths = `<polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="url(#gem-grad)"/><polygon points="12,0 15,9 12,12 9,9" fill="rgba(255,255,255,0.5)"/><polygon points="24,12 15,15 12,12 15,9" fill="rgba(255,255,255,0.3)"/><polygon points="12,24 9,15 12,12 15,15" fill="rgba(0,0,0,0.2)"/><polygon points="0,12 9,9 12,12 9,15" fill="rgba(255,255,255,0.1)"/>`;
  }

  const id = Math.random().toString(36).substr(2, 9);
  return `<svg class="gem-svg gem-tier-${tier}" width="100%" height="100%" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 8px ${primaryColor}80);"><defs><linearGradient id="gem-grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${primaryColor}" /><stop offset="100%" stop-color="${secondaryColor}" /></linearGradient></defs><g fill="url(#gem-grad-${id})">${paths.replace(/gem-grad/g, 'gem-grad-' + id)}</g></svg>`;
}
