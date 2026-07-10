const JOURNAL_QUOTES = [
  '🧳 走过的路，都是风景。',
  '🌅 日落归途，心有所栖。',
  '💫 把平淡过成浪漫，是一种本事。',
  '🍵 慢下来的时光，才最有味道。',
  '🎐 风吹过的地方，都有故事。',
  '🌿 藏在日常里的小美好，最动人。',
  '🪻 生活不必轰轰烈烈，温温柔柔就很好。',
  '🕊️ 此刻安宁，便是最好的远方。',
  '🎆 眼里有光的人，到哪都是星辰。',
  '🧸 收集快乐，是今天最重要的事。',
] as const

/** Pick a random journal quote, avoiding the previous one */
export function getRandomQuote(previous?: string): string {
  if (JOURNAL_QUOTES.length <= 1)
    return JOURNAL_QUOTES[0]

  let quote: string
  do {
    quote = JOURNAL_QUOTES[Math.floor(Math.random() * JOURNAL_QUOTES.length)]
  } while (quote === previous)

  return quote
}
