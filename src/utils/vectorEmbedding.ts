import "dotenv/config";
import axios from "axios";

const getVectorEmbedding = async (searchQuery: string) => {
  try {
    const response = await axios.post(process.env.AI_API_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: `Represent this sentence for searching relevant passages: ${searchQuery}`,
        model: "mixedbread-ai/mxbai-embed-large-v1",
        normalized: true,
      }),
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to get embedding. Status Code: ${response.status}`
      );
    }
    return response.data.data[0].embedding;
  } catch (error) {
    throw error;
  }
};

export default getVectorEmbedding;
