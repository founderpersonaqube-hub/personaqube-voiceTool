export function extractMetrics(transcript = "") {
  const text = transcript.toLowerCase().trim()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  const fillerPatterns = [
    /\bum\b/g,
    /\buh\b/g,
    /\blike\b/g,
    /\byou know\b/g,
    /\bactually\b/g,
    /\bbasically\b/g,
    /\bso\b(?=\s)/g,
  ]
  
  let fillerCount = 0
   fillerPatterns.forEach((pattern) => {
    const matches = text.match(pattern)
    if (matches) fillerCount += matches.length
  })

  const fillerRate = wordCount ? fillerCount / wordCount : 0
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3)
  const avgSentenceLength = sentences.length
    ? wordCount / sentences.length
    : 0
  
  const uniqueWords = new Set(words)
  const lexicalDiversity = wordCount
    ? uniqueWords.size / wordCount
    : 0

  const fragmentRate = sentences.length
    ? sentences.filter(s => s.split(" ").length < 4).length / sentences.length
    : 0

  return {
    fillerRate,
    avgSentenceLength,
    lexicalDiversity,
    fragmentRate,
  }
}



