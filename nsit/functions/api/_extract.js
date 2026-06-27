// Text extraction for .docx, .xlsx and .pdf — Cloudflare Worker compatible.
//   .docx / .xlsx : Office Open XML (a zip of XML parts) → unzip with fflate,
//                   pull text out of the relevant XML parts.
//   .pdf          : extract text with unpdf (a serverless-friendly pdf.js build).
//
// Each extractor throws on a genuinely unreadable file; the caller turns that
// into a per-file error so one bad file doesn't sink the whole upload.

import { unzipSync, strFromU8 } from "fflate";
// NOTE: `unpdf` is imported lazily inside extractPdf() — it is the only
// dependency that may require the `nodejs_compat` flag, so we keep it out of
// the module's top-level scope. That way a .docx / .xlsx upload scores even if
// the PDF dependency has an environment issue, instead of crashing the whole
// /api/score Function at import time.

const SUPPORTED = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export function extensionOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}

export function isSupported(filename) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED, extensionOf(filename));
}

// Pull readable text out of OOXML by collecting tag contents. We strip tags and
// keep text nodes; good enough to build a searchable corpus for id matching.
function xmlText(xml) {
  return xml
    .replace(/<[^>]+>/g, " ") // drop tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, " ")
    .trim();
}

function extractDocx(bytes) {
  const files = unzipSync(bytes);
  const parts = [];
  // Main body plus headers/footers and footnotes/endnotes if present.
  for (const name of Object.keys(files)) {
    if (
      name === "word/document.xml" ||
      /^word\/(header|footer)\d*\.xml$/.test(name) ||
      name === "word/footnotes.xml" ||
      name === "word/endnotes.xml"
    ) {
      parts.push(xmlText(strFromU8(files[name])));
    }
  }
  if (!parts.length && files["word/document.xml"]) {
    parts.push(xmlText(strFromU8(files["word/document.xml"])));
  }
  return parts.join(" ").trim();
}

function extractXlsx(bytes) {
  const files = unzipSync(bytes);
  const parts = [];
  // Shared strings hold most text; worksheets hold inline strings + numbers.
  if (files["xl/sharedStrings.xml"]) {
    parts.push(xmlText(strFromU8(files["xl/sharedStrings.xml"])));
  }
  for (const name of Object.keys(files)) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      parts.push(xmlText(strFromU8(files[name])));
    }
  }
  return parts.join(" ").trim();
}

async function extractPdf(bytes) {
  // Lazy-load so non-PDF uploads never depend on this module.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text || "").replace(/\s+/g, " ").trim();
}

// Extract text from one file. `bytes` is an ArrayBuffer or Uint8Array.
export async function extractFile(filename, bytes) {
  const ext = extensionOf(filename);
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.byteLength === 0) {
    throw new Error("File is empty.");
  }
  switch (ext) {
    case "docx":
      return extractDocx(u8);
    case "xlsx":
      return extractXlsx(u8);
    case "pdf":
      return await extractPdf(u8);
    default:
      throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }
}
