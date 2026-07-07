import { Router } from "express";

import {
  listConversationsController,
  createConversationController,
  listMessagesController,
  createMessageController,
  deleteConversationController,
  markAsReadController,
  updateAiModeController,
  uploadAttendanceFileController,
} from "./attendance.controller.js";

import { asyncHandler } from "../../shared/middlewares/async-handler.js";

import { auth } from "../../shared/middlewares/auth.js";
import { upload } from "../../config/multer.js";

const router = Router();

router.get(
  "/",
  auth,
  asyncHandler(
    listConversationsController
  )
);

router.post(
  "/",
  auth,
  asyncHandler(
    createConversationController
  )
);

router.delete(
  "/:id",
  auth,
  asyncHandler(
    deleteConversationController
  )
);

router.get(
  "/:id/messages",
  auth,
  asyncHandler(
    listMessagesController
  )
);

router.post(
  "/messages",
  auth,
  asyncHandler(
    createMessageController
  )
);

router.patch(
  "/:id/read",
  auth,
  asyncHandler(
    markAsReadController
  )
);

router.patch(
  "/:id/ai",
  auth,
  asyncHandler(
    updateAiModeController
  )
);

router.post(
  "/upload",
  auth,
  upload.single("file"),
  asyncHandler(
    uploadAttendanceFileController
  )
);

export { router as attendanceRoutes };
