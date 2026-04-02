// Voyage AI embeddings — Anthropic's embedding model
// Free tier: 50M tokens/month at voyageai.com
// Model: voyage-3-lite — 512 dims, fastest, ideal for RAG

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const EMBEDDING_MODEL = 'voyage-3-lite'
export const EMBEDDING_DIMS = 512

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 8000)

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env['VOYAGE_API_KEY']!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: cleaned,
      model: EMBEDDING_MODEL,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> }
  return data.data[0]?.embedding ?? []
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 8
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env['VOYAGE_API_KEY']!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: batch,
        model: EMBEDDING_MODEL,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Voyage API batch error ${res.status}: ${err}`)
    }

    const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> }
    const sorted = data.data.sort((a, b) => a.index - b.index)
    results.push(...sorted.map((d) => d.embedding))
  }

  return results
}
