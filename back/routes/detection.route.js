import express from "express";

import {
  getDetections,
  saveDetection,
} from "../controllers/detection.controller.js";
import e from "express";

const detectionRouter = express.Router();

detectionRouter.post("/", saveDetection);
detectionRouter.get("/", getDetections);

export default detectionRouter;
