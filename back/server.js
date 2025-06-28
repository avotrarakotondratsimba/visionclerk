import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import detectionRouter from "./routes/detection.route.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/detections", detectionRouter);

const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
