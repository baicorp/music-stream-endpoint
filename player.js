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
