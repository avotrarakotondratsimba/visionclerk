import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const saveDetection = async (req, res) => {
  try {
    const { objects } = req.body;
    const detection = await prisma.detection.create({ data: { objects } });
    res.status(201).json(detection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDetections = async (req, res) => {
  try {
    const detections = await prisma.detection.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(detections);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
