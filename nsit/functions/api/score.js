// POST /api/score
// Accepts multipart/form-data with one or more files under the field "files".
// Extracts text from every file, concatenates into one corpus, scores it against
// the NIST AI RMF control set, and returns a per-function + overall breakdown.

import controlSet from "./controls.json";
import { extractFile, isSupported, extensionOf } from "./_extract.js";
import { compileControls, scoreCorpus } from "./_scoring.js";

const compiled = compileControls(controlSet);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
const MAX_FILES = 20;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost({ request }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Upload a file using the form on the page." }, 400);
  }

  const files = form.getAll("files").filter((f) => f && typeof f === "object" && "arrayBuffer" in f);
  if (files.length === 0) {
    return json({ error: "No files received. Choose at least one .docx, .pdf, or .xlsx file." }, 400);
  }
  if (files.length > MAX_FILES) {
    return json({ error: `Too many files. Upload at most ${MAX_FILES} at once.` }, 400);
  }

  const perFile = [];
  const corpusParts = [];

  for (const file of files) {
    const name = file.name || "file";
    const entry = { name, ext: extensionOf(name), status: "ok", chars: 0, error: null };

    if (!isSupported(name)) {
      entry.status = "error";
      entry.error = `Unsupported file type. Allowed: .docx, .pdf, .xlsx.`;
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
      const buf = await file.arrayBuffer();
      const text = await extractFile(name, buf);
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
    return json(
      {
        error: "None of the uploaded files contained readable text.",
        files: perFile,
      },
      422
    );
  }

  const result = scoreCorpus(corpus, controlSet, compiled);

  return json({
    files: perFile,
    order: result.order,
    functions: result.functions, // [{name, earned, max, matched[], missed[]}]
    overall: result.overall, // {earned, max}
    corpusChars: corpus.length,
  });
}

// Reject non-POST methods with a clear JSON message (no catch-all onRequest,
// to avoid any handler-precedence ambiguity in Pages Functions).
export async function onRequestGet() {
  return json({ error: "Use POST with multipart/form-data to score documents." }, 405);
}
