import axios from "axios";

import fs from "fs";

import path from "path";

export function normalizeWhatsAppMessage(
  message: string
) {
  return String(message || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
) {
  const normalizedMessage =
    normalizeWhatsAppMessage(
      message
    );

  console.log("Enviando mensagem para:", to);

  const url =
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response =
    await axios.post(
      url,
      {
        messaging_product:
          "whatsapp",

        to,

        type: "text",

        text: {
          body:
            normalizedMessage,
        },
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data;
}

export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  language = "pt_BR",
  bodyParams = [],
  buttonUrlParam,
}: {
  to: string;
  templateName: string;
  language?: string;
  bodyParams?: string[];
  buttonUrlParam?: string;
}) {
  const normalizedBodyParams =
    bodyParams.map(
      normalizeWhatsAppMessage
    );
  const normalizedButtonUrlParam =
    buttonUrlParam
      ? normalizeWhatsAppMessage(
          buttonUrlParam
        )
      : undefined;
  const url =
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const components: any[] = [];

  if (bodyParams.length) {
    components.push({
      type: "body",
      parameters:
        normalizedBodyParams.map((text) => ({
          type: "text",
          text,
        })),
    });
  }

  if (normalizedButtonUrlParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text:
            normalizedButtonUrlParam,
        },
      ],
    });
  }

  const response =
    await axios.post(
      url,
      {
        messaging_product:
          "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: language,
          },
          components,
        },
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data;
}

export async function downloadWhatsAppMedia(
  mediaId: string
) {
  const mediaResponse =
    await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}`,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

  const mediaUrl =
    mediaResponse.data.url;

  const fileResponse =
    await axios.get(mediaUrl, {
      responseType: "arraybuffer",

      headers: {
        Authorization:
          `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
    });

  const contentType =
    String(
      fileResponse.headers[
        "content-type"
      ] || ""
    );
    
  let extension = "bin";

  if (
    contentType.includes("image")
  ) {
    extension = "jpg";
  }

  if (
    contentType.includes("audio")
  ) {
    extension = "ogg";
  }

  if (
    contentType.includes(
      "application/pdf"
    )
  ) {
    extension = "pdf";
  }

  const fileName =
    `${Date.now()}.${extension}`;

  const uploadDir = path.resolve(
    "uploads"
  );

  if (
    !fs.existsSync(uploadDir)
  ) {
    fs.mkdirSync(uploadDir);
  }

  const filePath = path.join(
    uploadDir,
    fileName
  );

  fs.writeFileSync(
    filePath,
    fileResponse.data
  );

  return {
    fileName,

    filePath,

    contentType,
  };
}

export async function
sendWhatsAppMediaMessage(
  to: string,
  mediaUrl: string,
  type: string,
  caption?: string
) {
  const normalizedCaption =
    caption
      ? normalizeWhatsAppMessage(
          caption
        )
      : undefined;

  const url =
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  let payload: any = {
    messaging_product:
      "whatsapp",

    to,

    type,
  };

  payload[type] = {
    link: mediaUrl,
  };

  if (
    normalizedCaption &&
    type !== "audio"
  ) {
    payload[type].caption =
      normalizedCaption;
  }

  const response =
    await axios.post(
      url,
      payload,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data;
}
