import { Router }
  from "express";
import { listContactsController, showContactController } from "./contact.controller";


const contactRoutes =
  Router();

contactRoutes.get(
  "/",
  listContactsController
);

contactRoutes.get(
  "/:id",
  showContactController
);

export {
  contactRoutes,
};