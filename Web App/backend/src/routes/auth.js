// src/routes/auth.js
import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export function makeAuthRouter(controller, eventController) {
  const router = Router();

  // Admin registration is now admin-only. Bootstrap admin is created
  // through seed.js. Previously this was public, letting anyone on the
  // internet create an admin account.
  router.post(
    "/register",
    requireAdmin,
    [
      body("email").isEmail().withMessage("Valid email required"),
      body("password").isLength({ min: 6 }).withMessage("Password >= 6 chars"),
    ],
    controller.register
  );

  router.post(
    "/login",
    [
      body("email").isEmail().withMessage("Valid email required"),
      body("password").notEmpty().withMessage("Password required"),
    ],
    controller.login
  );

  router.get("/me", requireAuth, controller.me);
  router.get("/dashboard", requireAuth, controller.dashboard);

  // Public: consume reset token and set new password
  if (eventController?.consumeResetToken) {
    router.post("/reset-password", eventController.consumeResetToken);
  }

  return router;
}
