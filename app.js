import express from "express";
import fetch from "node-fetch";
import cors from "cors";
const app = express();
const port = 3000;
app.use(cors());

// main entry
app.get("/", (req, res) => {
  res.json({ message: "Finally you here!" });
});

// get stream data by id parameter
app.post("/stream/:id", async (req, res) => {
  const body = {
    videoId: req.params.id,
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
      },
      thirdParty: {
        embedUrl: "https://www.youtube.com",
      },
    },
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: "19746",
      },
    },
  };
  const youtubeApiUrl =
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
  try {
    const response = await fetch(youtubeApiUrl, {
      method: "POST",
      headers: {
        Host: "www.youtube.com",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42",
        Accept: "*/*",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "de,de-DE;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.listen(process.env.PORT || port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
