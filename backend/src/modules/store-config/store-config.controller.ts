import {
  Request,
  Response,
} from "express";

import {
  getStoreConfig,
  updateStoreConfig,
} from "./store-config.service.js";

export async function getStoreConfigController(
  _: Request,
  res: Response
) {

  const config =
    await getStoreConfig();

  return res.json(
    config
  );
}

export async function updateStoreConfigController(
  req: Request,
  res: Response
) {

  const config =
    await updateStoreConfig(
      req.body
    );

  return res.json(
    config
  );
}