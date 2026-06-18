function renderInlineMarkdown(text) {
  const parts =
    String(text || "").split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#43232d]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

export function MarkdownInline({ children }) {
  return renderInlineMarkdown(children);
}

export default function MarkdownText({
  children,
  className = "",
}) {
  const lines =
    String(children || "")
      .split(/\r?\n/)
      .map((line) => line.trimEnd());
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) {
      return;
    }

    blocks.push({
      type: "list",
      items: listItems,
    });
    listItems = [];
  }

  for (const line of lines) {
    const bullet =
      line.match(/^\s*[-*]\s+(.+)/);

    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }

    flushList();

    if (!line.trim()) {
      blocks.push({
        type: "space",
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: line,
    });
  }

  flushList();

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "space") {
          return <div key={index} className="h-3" />;
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="my-3 list-disc space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="mb-3 last:mb-0">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}
