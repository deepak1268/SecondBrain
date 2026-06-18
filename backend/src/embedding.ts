import { openai } from "./openai.js";

export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("No embedding returned from OpenAI");
  }

  return embedding;
}