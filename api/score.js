import controlSet from "../functions/api/controls.json" with { type: "json" };
import { extractFile, isSupported, extensionOf } from "../functions/api/_extract.js";
import { compileControls, scoreCorpus } from "../functions/api/_scoring.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const compiled = compileControls(controlSet);
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20;

function sendJson(res, body, status = 200) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseContentDisposition(value) {
  const attrs = {};
  for (const part of String(value || "").split(";").slice(1)) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) continue;
    attrs[rawKey.toLowerCase()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
  }
  return attrs;
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!boundaryMatch) {
    throw new Error("Missing multipart boundary.");
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const files = [];
  let offset = 0;

  while (offset < buffer.length) {
    const boundaryStart = buffer.indexOf(boundary, offset);
    if (boundaryStart === -1) break;

    const partStart = boundaryStart + boundary.length;
    if (buffer.slice(partStart, partStart + 2).toString() === "--") break;

    const headerStart = buffer.slice(partStart, partStart + 2).toString() === "\r\n"
      ? partStart + 2
      : partStart;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), headerStart);
    if (headerEnd === -1) break;

    const nextBoundary = buffer.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;

    const rawHeaders = buffer.slice(headerStart, headerEnd).toString("utf8");
    const headers = Object.fromEntries(
      rawHeaders.split("\r\n").map((line) => {
        const index = line.indexOf(":");
        return index === -1
          ? ["", ""]
          : [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()];
      }).filter(([key]) => key)
    );

    const disposition = parseContentDisposition(headers["content-disposition"]);
    if (disposition.name === "files" && disposition.filename) {
      let dataEnd = nextBoundary;
      if (buffer.slice(dataEnd - 2, dataEnd).toString() === "\r\n") {
        dataEnd -= 2;
      }
      files.push({
        name: disposition.filename,
        size: dataEnd - headerEnd - 4,
        arrayBuffer: async () => {
          const bytes = buffer.slice(headerEnd + 4, dataEnd);
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      });
    }

    offset = nextBoundary;
  }

  return files;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, { error: "Use POST with multipart/form-data to score documents." }, 405);
  }

  let files;
  try {
    const body = await readRequest(req);
    files = parseMultipart(body, req.headers["content-type"]);
  } catch {
    return sendJson(res, { error: "Upload a file using the form on the page." }, 400);
  }

  if (files.length === 0) {
    return sendJson(res, { error: "No files received. Choose at least one .docx, .pdf, or .xlsx file." }, 400);
  }
  if (files.length > MAX_FILES) {
    return sendJson(res, { error: `Too many files. Upload at most ${MAX_FILES} at once.` }, 400);
  }

  const perFile = [];
  const corpusParts = [];

  for (const file of files) {
    const name = file.name || "file";
    const entry = { name, ext: extensionOf(name), status: "ok", chars: 0, error: null };

    if (!isSupported(name)) {
      entry.status = "error";
      entry.error = "Unsupported file type. Allowed: .docx, .pdf, .xlsx.";
      perFile.push(entry);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      entry.status = "error";
      entry.error = `File is too large (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB).`;
      perFile.push(entry);
      continue;
    }

    try {
      const text = await extractFile(name, await file.arrayBuffer());
      if (!text || !text.trim()) {
        entry.status = "empty";
        entry.error = "No readable text found in this file.";
      } else {
        entry.chars = text.length;
        corpusParts.push(text);
      }
    } catch (err) {
      entry.status = "error";
      entry.error = `Could not read this file. ${err && err.message ? err.message : ""}`.trim();
    }
    perFile.push(entry);
  }

  const corpus = corpusParts.join("\n");
  if (!corpus.trim()) {
    return sendJson(res, { error: "None of the uploaded files contained readable text.", files: perFile }, 422);
  }

  const result = scoreCorpus(corpus, controlSet, compiled);
  return sendJson(res, {
    files: perFile,
    order: result.order,
    functions: result.functions,
    overall: result.overall,
    corpusChars: corpus.length,
  });
}
