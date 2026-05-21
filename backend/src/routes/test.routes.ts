import { Router } from "express";
import { createMessage } from "../modules/attendance/attendance.service";


const router =
  Router();

router.get(
  "/test-ai",

  async (_, res) => {

    await createMessage({
      conversation_id: 1,
      sender_type: "client",
      content:
        "Oi, quem fala? Gostaria de saber mais sobre os produtos de cuidados com a pele que vocês oferecem.",
    });

    return res.json({
      ok: true,
    });
  }
);

export default router;