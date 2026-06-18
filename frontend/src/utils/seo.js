const DEFAULT_SEO = {
  title: "Helô Cosméticos | Skincare e cuidados premium",
  description:
    "Compre cosméticos Helô para pele e cabelos: desconto exclusivo no PIX, até 3x sem juros e frete grátis em Goiânia e região metropolitana.",
  image: "https://helocosmeticos.com/helo-logo.png",
  url: "https://helocosmeticos.com/",
};

function upsertMeta(selector, attributes) {
  let element =
    document.head.querySelector(selector);

  if (!element) {
    element =
      document.createElement("meta");

    Object.entries(attributes.identity).forEach(
      ([key, value]) => {
        element.setAttribute(key, value);
      }
    );

    document.head.appendChild(element);
  }

  element.setAttribute(
    "content",
    attributes.content || ""
  );
}

function upsertCanonical(url) {
  let element =
    document.head.querySelector(
      'link[rel="canonical"]'
    );

  if (!element) {
    element =
      document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

function absoluteUrl(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(
      value,
      window.location.origin
    ).toString();
  } catch {
    return value;
  }
}

export function setSeoMeta({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  image = DEFAULT_SEO.image,
  url = DEFAULT_SEO.url,
} = {}) {
  const normalizedDescription =
    String(description || DEFAULT_SEO.description)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  const absolutePageUrl =
    absoluteUrl(url || DEFAULT_SEO.url);
  const absoluteImageUrl =
    absoluteUrl(image || DEFAULT_SEO.image);

  document.title =
    title || DEFAULT_SEO.title;

  upsertMeta(
    'meta[name="description"]',
    {
      identity: {
        name: "description",
      },
      content: normalizedDescription,
    }
  );

  upsertMeta(
    'meta[property="og:title"]',
    {
      identity: {
        property: "og:title",
      },
      content: title,
    }
  );

  upsertMeta(
    'meta[property="og:description"]',
    {
      identity: {
        property: "og:description",
      },
      content: normalizedDescription,
    }
  );

  upsertMeta(
    'meta[property="og:url"]',
    {
      identity: {
        property: "og:url",
      },
      content: absolutePageUrl,
    }
  );

  upsertMeta(
    'meta[property="og:image"]',
    {
      identity: {
        property: "og:image",
      },
      content: absoluteImageUrl,
    }
  );

  upsertMeta(
    'meta[name="twitter:title"]',
    {
      identity: {
        name: "twitter:title",
      },
      content: title,
    }
  );

  upsertMeta(
    'meta[name="twitter:description"]',
    {
      identity: {
        name: "twitter:description",
      },
      content: normalizedDescription,
    }
  );

  upsertMeta(
    'meta[name="twitter:image"]',
    {
      identity: {
        name: "twitter:image",
      },
      content: absoluteImageUrl,
    }
  );

  upsertCanonical(absolutePageUrl);
}

export function resetSeoMeta() {
  setSeoMeta(DEFAULT_SEO);
}
