import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import axios from "axios";
import bodyParser from "body-parser";
import { Innertube } from "youtubei.js";

const app = express();
const port = 5000;

app.use(bodyParser.json());
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

app.post("/watch", async (req, res) => {
  const videoId = req.query.videoId;

  if (!videoId) {
    return res
      .status(400)
      .json({ error: "videoId query parameter is required" });
  }
  const response = await fetch(
    "https://music.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
        Cookie:
          "CONSENT=YES+; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgLC_pwY",
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "ANDROID_TESTSUITE",
            clientVersion: "1.9",
            androidSdkVersion: 30,
            hl: "en",
            gl: "ID",
            utcOffsetMinutes: 0,
            params: "8AEB",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`YouTube API Error: ${errorData.error.message}`);
  }

  const data = await response.json();

  const thumbnails = data?.videoDetails?.thumbnail?.thumbnails[0]?.url;
  const result = {
    videoId: data?.videoDetails?.videoId,
    title: data?.videoDetails?.title,
    thumbnailUrl: thumbnails,
    channelId: data?.videoDetails?.channelId,
    uploader: data?.videoDetails?.author,
    videoDetails: { ...data?.videoDetails, thumbnail: thumbnails },
    url: data.streamingData?.adaptiveFormats[
      data.streamingData?.adaptiveFormats?.length - 1
    ]?.url,
  };

  res.send(result?.url);
});

const baseURL = "https://music.youtube.com";
const apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
  },
  params: {
    prettyPrint: "false",
  },
});

const endpoints = {
  player: "/youtubei/v1/player",
};

async function fetchPlayer(body) {
  try {
    const response = await axiosInstance.post(endpoints.player, body, {
      headers: {
        "X-Goog-Api-Key": apiKey,
      },
    });

    if (response.data.playabilityStatus.status === "OK") {
      return response.data;
    } else {
      const safeBody = {
        ...body,
        context: {
          ...body.context,
          thirdParty: {
            embedUrl: `https://www.youtube.com/watch?v=${body.videoId}`,
          },
        },
      };

      const safeResponse = await axiosInstance.post(endpoints.player, safeBody);

      if (safeResponse.data.playabilityStatus.status !== "OK") {
        return response.data;
      }

      const audioStreamsResponse = await axios.get(
        `https://watchapi.whatever.social/streams/${body.videoId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const audioStreams = audioStreamsResponse.data.audioStreams;

      const updatedFormats =
        safeResponse.data.streamingData.adaptiveFormats.map((format) => {
          const matchedStream = audioStreams.find(
            (stream) => stream.bitrate === format.bitrate
          );
          return {
            ...format,
            url: matchedStream ? matchedStream.url : format.url,
          };
        });

      return {
        ...safeResponse.data,
        streamingData: {
          ...safeResponse.data.streamingData,
          adaptiveFormats: updatedFormats,
        },
      };
    }
  } catch (error) {
    console.error("Error fetching player data:", error);
    throw error;
  }
}

app.post("/proxy/player", async (req, res) => {
  try {
    const playerData = await fetchPlayer(req.body);
    res.json(playerData);
  } catch (error) {
    res
      .status(error.response ? error.response.status : 500)
      .send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
