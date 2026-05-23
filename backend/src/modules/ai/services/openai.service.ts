import OpenAI from "openai";

console.log("ENV LOCAL:", process.env.OPENAI_API_KEY);

console.log("Todas variáveis OPENAI:");
Object.keys(process.env)
  .filter((k) => k.includes("OPENAI"))
  .forEach((k) => {
    console.log(k, process.env[k]);
  });
  console.log("process.cwd():", process.cwd());

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