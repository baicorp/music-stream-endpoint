import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
const port = 5000;
app.use(cors());

// main entry
app.get("/", (res) => {
  res.json({ message: "Finally you here!" });
});

// get stream data by id parameter
app.post("/stream", async (req, res) => {
  const videoId = req.query.videoId;

  console.log(videoId);
  const yt = await Innertube.create();
  const info = await yt.getBasicInfo(videoId);
  const format = info.chooseFormat({ type: "audio", quality: "best" });
  const url = format?.decipher(yt.session.player);
  res.send(url);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
