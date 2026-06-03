import Busboy from "busboy";
import { createWriteStream } from "fs";
import { mkdir, rm, stat } from "fs/promises";
import http from "http";
import path from "path";
import { pipeline } from "stream/promises";

const PORT = Number(process.env.PORT || 3000);
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || "/media";
const PUBLIC_BASE_URL = (process.env.MEDIA_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const UPLOAD_TOKEN = process.env.MEDIA_UPLOAD_TOKEN || "";
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 100 * 1024 * 1024);

if (!UPLOAD_TOKEN) {
  throw new Error("MEDIA_UPLOAD_TOKEN is required.");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function isAuthorized(request) {
  const auth = request.headers.authorization || "";
  return auth === `Bearer ${UPLOAD_TOKEN}`;
}

function normalizePath(value) {
  const raw = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(raw);

  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Invalid upload path.");
  }

  if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
    throw new Error("Upload path contains unsupported characters.");
  }

  return normalized;
}

function publicUrlFor(uploadPath) {
  if (!PUBLIC_BASE_URL) return "";
  return `${PUBLIC_BASE_URL}/${uploadPath}`;
}

async function handleUpload(request, response) {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  const contentType = request.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(response, 400, { error: "Expected multipart/form-data." });
    return;
  }

  const busboy = Busboy({
    headers: request.headers,
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
      fields: 8,
    },
  });

  const fields = {};
  const uploads = [];
  let failure = null;

  busboy.on("field", (name, value) => {
    fields[name] = value;
  });

  busboy.on("file", (_name, file, info) => {
    const upload = (async () => {
      try {
        const uploadPath = normalizePath(fields.path);
        const destination = path.join(UPLOAD_ROOT, ...uploadPath.split("/"));
        const destinationDir = path.dirname(destination);
        await mkdir(destinationDir, { recursive: true });

        let size = 0;
        file.on("data", (chunk) => {
          size += chunk.length;
        });

        file.on("limit", () => {
          failure = new Error("File too large.");
          file.resume();
        });

        await pipeline(file, createWriteStream(destination, { flags: "w" }));

        if (failure) {
          await rm(destination, { force: true });
          throw failure;
        }

        const fileStat = await stat(destination);
        return {
          path: uploadPath,
          url: publicUrlFor(uploadPath),
          filename: info.filename,
          contentType: info.mimeType || fields.contentType || "application/octet-stream",
          size: fileStat.size || size,
        };
      } catch (error) {
        failure = error;
        file.resume();
        throw error;
      }
    })();

    uploads.push(upload);
  });

  busboy.on("error", (error) => {
    failure = error;
  });

  busboy.on("finish", async () => {
    try {
      if (failure) throw failure;
      const [result] = await Promise.all(uploads);
      if (!result) {
        sendJson(response, 400, { error: "No file received." });
        return;
      }
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  });

  request.pipe(busboy);
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && request.url === "/upload") {
    await handleUpload(request, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Media upload server listening on :${PORT}`);
});
