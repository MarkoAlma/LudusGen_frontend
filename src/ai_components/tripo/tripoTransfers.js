const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function getAuthToken(getIdToken) {
  return getIdToken ? await getIdToken() : "";
}

export async function uploadViaTripoSts({ getIdToken, kind, file }) {
  const token = await getAuthToken(getIdToken);
  const targetRes = await fetch(`${BASE_URL}/api/tripo/upload/sts-target`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      kind,
      filename: file?.name || `${kind}.bin`,
      mimeType: file?.type || "application/octet-stream",
    }),
  });
  const targetData = await targetRes.json();
  if (!targetData.success) {
    throw new Error(targetData.message || "STS target request failed");
  }

  const uploadRes = await fetch(targetData.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": targetData.contentType || file?.type || "application/octet-stream",
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Direct upload failed (${uploadRes.status})`);
  }

  return {
    type: targetData.format,
    object: {
      bucket: targetData.bucket,
      key: targetData.key,
    },
    contentType: targetData.contentType,
    filename: file?.name || null,
  };
}

export async function streamTaskStatus({
  taskId,
  getIdToken,
  signal,
  onStatus,
}) {
  const token = await getAuthToken(getIdToken);
  const res = await fetch(`${BASE_URL}/api/tripo/task/${taskId}/stream`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Task stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const lines = rawEvent.split("\n");
      let eventType = "message";
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }

      if (!dataLines.length) continue;
      const payload = JSON.parse(dataLines.join("\n"));
      onStatus?.(eventType, payload);
    }
  }
}
