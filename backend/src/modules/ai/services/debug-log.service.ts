const isDevelopment =
  process.env.NODE_ENV !== "production";

export function debugAiLog(
  label: string,
  data: unknown
) {
  if (!isDevelopment) {
    return;
  }

  console.log(
    `\n========== [IA DEBUG] ${label} ==========\n`
  );

  if (typeof data === "string") {
    console.log(data);
  } else {
    console.log(
      JSON.stringify(
        data,
        null,
        2
      )
    );
  }

  console.log(
    "\n=========================================\n"
  );
}
