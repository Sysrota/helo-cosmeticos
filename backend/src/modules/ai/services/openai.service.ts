import OpenAI from "openai";

const openai =
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

interface Message {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
}

interface Props {
  messages: Message[];
}

export async function gerarRespostaIA({
  messages,
}: Props) {

  const response =
    await openai.chat.completions.create({
      model:
        "gpt-4.1-mini",

      temperature: 0.4,

      messages,
    });

  return response
    .choices[0]
    ?.message
    ?.content;
}