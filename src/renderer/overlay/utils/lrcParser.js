/**
 * LRC lyrics parser helper.
 */
export function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.+)/;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      const time = min * 60 + sec + ms / 1000;
      const text = match[4].trim();
      if (text) parsed.push({ time, text });
    }
  }
  parsed.sort((a, b) => a.time - b.time);
  return parsed;
}
