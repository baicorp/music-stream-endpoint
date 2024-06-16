import axios from "axios";

function getStringBetweenStrings(data, start_string, end_string) {
  const regex = new RegExp(
    `${escapeStringRegexp(start_string)}(.*?)${escapeStringRegexp(end_string)}`,
    "s"
  );
  const match = data.match(regex);
  return match ? match[1] : undefined;
}

function extractSigTimestamp(data) {
  return parseInt(
    getStringBetweenStrings(data, "signatureTimestamp:", ",") || "0"
  );
}

function extractSigSourceCode(data) {
  const calls = getStringBetweenStrings(
    data,
    'function(a){a=a.split("")',
    'return a.join("")}'
  );
  const obj_name = calls?.split(/\.|\[/)?.[0]?.replace(";", "")?.trim();
  const functions = getStringBetweenStrings(data, `var ${obj_name}={`, "};");

  if (!functions || !calls) {
    // Log.warn(TAG, "Failed to extract signature decipher algorithm.");
    console.log("Failed to extract signature decipher algorithm.");
    return "Failed to extract signature decipher algorithm.";
  }

  return `function descramble_sig(a) { a = a.split(""); let ${obj_name}={${functions}}${calls} return a.join("") } descramble_sig(sig);`;
}

function extractNSigSourceCode(data) {
  const sc = `function descramble_nsig(a) { let b=a.split("")${getStringBetweenStrings(
    data,
    'b=a.split("")',
    '}return b.join("")}'
  )}} return b.join(""); } descramble_nsig(nsig)`;

  if (!sc) {
    console.log("Failed to extract n-token decipher algorithm");
    return "Failed to extract n-token decipher algorithm";
  }

  return sc;
}

export async function player() {
  const res = await fetch("www.youtube.com/iframe_api");

  if (res.status !== 200) throw new PlayerError("Failed to request player id");

  const js = await res.text();

  const player_id = getStringBetweenStrings(js, "player\\/", "\\/");
  console.log("playerID : ", player_id);

  const player_url = new URL(
    `/s/player/${player_id}/player_ias.vflset/en_US/base.js`,
    "www.youtube.com"
  );

  const player_res = await fetch(
    `www.youtube.com/s/player/${player_id}/player_ias.vflset/en_US/base.js`,
    {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
      },
    }
  );
  if (!player_res.ok) {
    throw new PlayerError(`Failed to get player data: ${player_res.status}`);
  }

  const player_js = await player_res.text();

  const sig_timestamp = extractSigTimestamp(player_js);
  const sig_sc = extractSigSourceCode(player_js);
  const nsig_sc = extractNSigSourceCode(player_js);

  return {
    sig_timestamp,
    sig_sc,
    nsig_sc,
    player_id,
  };
}

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

export async function fetchPlayer(body) {
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
