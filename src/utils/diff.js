/**
 * Simple word-based diff utility for forensic legal analysis
 */
export const computeDiff = (oldStr = '', newStr = '') => {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const diff = [];
  let i = 0;
  let j = 0;

  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      diff.push({ type: 'unchanged', value: oldWords[i] });
      i++;
      j++;
    } else {
      // Very basic diff logic for hackathon speed:
      // If words don't match, we show a removal and an addition
      if (i < oldWords.length) {
        diff.push({ type: 'removed', value: oldWords[i] });
        i++;
      }
      if (j < newWords.length) {
        diff.push({ type: 'added', value: newWords[j] });
        j++;
      }
    }
  }

  return diff;
};
