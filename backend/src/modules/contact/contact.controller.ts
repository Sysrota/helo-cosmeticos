import {
  Request,
  Response,
} from "express";
import { listContacts, showContact, updateContactService } from "./contact.service";
import { prisma } from "@/config/prisma";


export async function listContactsController(
  _: Request,
  res: Response
) {

  const contacts =
    await listContacts();

  return res.json(
    contacts
  );
}


export async function showContactController(
  req: Request,
  res: Response
) {

  const contact =
  await showContact(
    Number(
      req.params.id
    )
  );

  return res.json(
    contact
  );
}

export async function updateContactController(
  req: Request,
  res: Response
) {

  try {

    const contact =
      await updateContactService({
        id: Number(
          req.params.id
        ),

        ...req.body,
      });

    return res.json(
      contact
    );

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error:
        "Erro ao atualizar cliente",
    });
  }
}