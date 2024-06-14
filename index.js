import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
const port = 5000;

app.use(express.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("Finally you here!");
});

app.post("/stream", async (req, res) => {
  try {
    const videoId = req.query.videoId;

    if (!videoId) {
      return res
        .status(400)
        .json({ error: "videoId query parameter is required" });
    }

    const yt = await Innertube.create();
    const info = await yt.getBasicInfo(videoId);

    if (!info) {
      return res.status(404).json({ error: "Video not found" });
    }

    const format = info.chooseFormat({ type: "audio", quality: "best" });

    if (!format) {
      return res.status(404).json({ error: "Suitable format not found" });
    }

    const url = format.decipher(yt.session.player);

    if (!url) {
      return res.status(500).json({ error: "Failed to retrieve stream URL" });
    }
    res.send(url);
  } catch (error) {
    res.status(500).json({ error: "internal setver error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
