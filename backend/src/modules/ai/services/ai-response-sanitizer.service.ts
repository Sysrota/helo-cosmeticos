const imageExtensions =
  /\.(png|jpe?g|webp|gif)(\?[^\s)]*)?/i;

export function sanitizeAiResponse(content: string) {
  const cleaned =
    content
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/https?:\/\/\S*\/uploads\/\S+/gi, "")
          .replace(/\/uploads\/\S+/gi, "")
          .replace(/\S+\/uploads\/\S+/gi, "")
          .trim()
      )
      .filter((line) => {
        if (!line) {
          return false;
        }

        return !imageExtensions.test(line);
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  return (
    cleaned ||
    "Claro, vou te enviar a imagem do produto."
  );
}
