// GET /api/controls — returns the scorable control set for transparency.
import controlSet from "./controls.json";

export async function onRequestGet() {
  return new Response(JSON.stringify(controlSet, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
