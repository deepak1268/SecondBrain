import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: "Binary Lifting for LCA",
  });
  const vectorLength = response.data?.[0]?.embedding?.length ?? 0;
  console.log("Vector Length:", vectorLength);
}

test();