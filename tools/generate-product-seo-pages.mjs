import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const rootDir =
  path.resolve(
    import.meta.dirname,
    ".."
  );
const backendDir =
  path.join(
    rootDir,
    "backend"
  );
const frontendDistDir =
  path.join(
    rootDir,
    "frontend",
    "dist"
  );
const indexPath =
  path.join(
    frontendDistDir,
    "index.html"
  );

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  for (const line of content.split(/\r?\n/)) {
    const trimmed =
      line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      !trimmed.includes("=")
    ) {
      continue;
    }

    const [key,
      ...rest] =
      trimmed.split("=");
    const value =
      rest
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] =
        value;
    }
  }
}

function escapeAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function compactDescription(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function absoluteUrl(value, siteUrl) {
  if (!value) {
    return "";
  }

  try {
    return new URL(
      value,
      siteUrl
    ).toString();
  } catch {
    return value;
  }
}

function replaceTag(html, pattern, replacement) {
  if (pattern.test(html)) {
    return html.replace(
      pattern,
      replacement
    );
  }

  return html.replace(
    "</head>",
    `    ${replacement}\n  </head>`
  );
}

function applyProductSeo(html, seo) {
  let nextHtml =
    html.replace(
      /<title>.*?<\/title>/s,
      `<title>${escapeAttribute(seo.title)}</title>`
    );

  const tags = [
    {
      pattern:
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="description" content="${escapeAttribute(seo.description)}" />`,
    },
    {
      pattern:
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      html:
        `<link rel="canonical" href="${escapeAttribute(seo.url)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:type" content="product" />`,
    },
    {
      pattern:
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:url" content="${escapeAttribute(seo.url)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:title" content="${escapeAttribute(seo.title)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:description" content="${escapeAttribute(seo.description)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image" content="${escapeAttribute(seo.image)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image:secure_url" content="${escapeAttribute(seo.image)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image:type" content="${escapeAttribute(seo.imageType)}" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image:width" content="1200" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image:height" content="1200" />`,
    },
    {
      pattern:
        /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta property="og:image:alt" content="${escapeAttribute(seo.title)}" />`,
    },
    {
      pattern:
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="twitter:title" content="${escapeAttribute(seo.title)}" />`,
    },
    {
      pattern:
        /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="twitter:card" content="summary_large_image" />`,
    },
    {
      pattern:
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="twitter:description" content="${escapeAttribute(seo.description)}" />`,
    },
    {
      pattern:
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="twitter:image" content="${escapeAttribute(seo.image)}" />`,
    },
    {
      pattern:
        /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
      html:
        `<meta name="twitter:image:alt" content="${escapeAttribute(seo.title)}" />`,
    },
  ];

  for (const tag of tags) {
    nextHtml =
      replaceTag(
        nextHtml,
        tag.pattern,
        tag.html
      );
  }

  return nextHtml;
}

loadEnvFile(
  path.join(
    backendDir,
    ".env"
  )
);

function publicSiteUrl() {
  const configuredUrl =
    process.env.SEO_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.FRONTEND_URL ||
    "";

  if (
    !configuredUrl ||
    /localhost|127\.0\.0\.1/i.test(configuredUrl)
  ) {
    return "https://helocosmeticos.com";
  }

  return configuredUrl.replace(/\/$/, "");
}

function imageContentType(imageUrl) {
  const pathname =
    (() => {
      try {
        return new URL(imageUrl).pathname;
      } catch {
        return imageUrl;
      }
    })().toLowerCase();

  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (pathname.endsWith(".webp")) {
    return "image/webp";
  }

  if (pathname.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/png";
}

const siteUrl =
  publicSiteUrl();

if (!fs.existsSync(indexPath)) {
  throw new Error(
    `Build do frontend não encontrado em ${indexPath}`
  );
}

const requireFromBackend =
  createRequire(
    path.join(
      backendDir,
      "package.json"
    )
  );
const { PrismaClient } =
  requireFromBackend("@prisma/client");

const prisma =
  new PrismaClient();

try {
  const template =
    fs.readFileSync(
      indexPath,
      "utf8"
    );
  const products =
    await prisma.product.findMany({
      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },
    });
  const productSeoDir =
    path.join(
      frontendDistDir,
      "produto"
    );
  const productIds =
    new Set(
      products.map((product) =>
        String(product.id)
      )
    );

  fs.mkdirSync(
    productSeoDir,
    {
      recursive: true,
    }
  );

  for (const entry of fs.readdirSync(productSeoDir, { withFileTypes: true })) {
    const entryId =
      entry.isFile() && entry.name.endsWith(".html")
        ? entry.name.replace(/\.html$/, "")
        : entry.name;

    if (!/^\d+$/.test(entryId) || productIds.has(entryId)) {
      continue;
    }

    fs.rmSync(
      path.join(productSeoDir, entry.name),
      {
        force: true,
        recursive: entry.isDirectory(),
      }
    );
  }

  for (const product of products) {
    const productUrl =
      `${siteUrl}/produto/${product.id}`;
    const imagePath =
      product.image_url ||
      product.images?.[0]?.image_url ||
      "/helo-logo.png";
    const description =
      compactDescription(
        product.meta_description ||
        product.subtitle ||
        product.description ||
        "Compre cosméticos Helô para pele e cabelos com pagamento seguro e condições especiais."
      );
    const html =
      applyProductSeo(
        template,
        {
          title:
            `${String(product.title || "").trim()} | Helô Cosméticos`,
          description,
          image:
            absoluteUrl(
              imagePath,
              siteUrl
            ),
          imageType:
            imageContentType(imagePath),
          url:
            productUrl,
        }
      );
    const outputDir =
      path.join(
        productSeoDir,
        String(product.id)
      );

    fs.mkdirSync(
      outputDir,
      {
        recursive: true,
      }
    );
    fs.writeFileSync(
      path.join(
        outputDir,
        "index.html"
      ),
      html
    );
    fs.writeFileSync(
      path.join(
        productSeoDir,
        `${product.id}.html`
      ),
      html
    );
  }

  console.log(
    `SEO de produtos gerado para ${products.length} página(s).`
  );
} finally {
  await prisma.$disconnect();
}
