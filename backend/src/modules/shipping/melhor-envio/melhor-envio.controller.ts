import {
  Request,
  Response,
} from "express";

import axios from "axios";

export async function connectMelhorEnvioController(
  _: Request,
  res: Response
) {

  const params =
    new URLSearchParams({
      client_id:
        process.env
          .MELHOR_ENVIO_CLIENT_ID || "",

      redirect_uri:
        process.env
          .MELHOR_ENVIO_REDIRECT_URI || "",

      response_type:
        "code",

      scope:
        "shipping-calculate shipping-generate shipping-tracking",
    });

  return res.redirect(
    `https://www.melhorenvio.com.br/oauth/authorize?${params.toString()}`
  );
}

export async function melhorEnvioCallbackController(
  req: Request,
  res: Response
) {

  try {

    const { code } =
      req.query;

    if (!code) {

      return res.status(400).send(
        "Code não informado"
      );
    }

    const response =
      await axios.post(
        "https://www.melhorenvio.com.br/oauth/token",
        {
          grant_type:
            "authorization_code",

          client_id:
            process.env
              .MELHOR_ENVIO_CLIENT_ID,

          client_secret:
            process.env
              .MELHOR_ENVIO_CLIENT_SECRET,

          redirect_uri:
            process.env
              .MELHOR_ENVIO_REDIRECT_URI,

          code,
        }
      );

    // console.log(
    //   "TOKEN:",
    //   response.data
    // );

    return res.send(
      "Melhor Envio conectado com sucesso"
    );

  } catch (error: any) {

    console.log(
      error?.response?.data ||
      error
    );

    return res.status(500).send(
      "Erro OAuth Melhor Envio"
    );
  }
}