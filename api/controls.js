import controlSet from "../functions/api/controls.json" with { type: "json" };

export default function handler(_req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(controlSet, null, 2));
}
