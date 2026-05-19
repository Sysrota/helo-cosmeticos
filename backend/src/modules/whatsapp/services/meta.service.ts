import axios from "axios";

import fs from "fs";

import path from "path";

export async function sendWhatsAppMessage(
  to: string,
  message: string
) {
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
          body: message,
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