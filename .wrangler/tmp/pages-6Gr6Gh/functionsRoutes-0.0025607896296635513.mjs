import { onRequestGet as __api_controls_js_onRequestGet } from "C:\\Users\\Hackathons\\Sub Build\\code_base\\PromptStrike\\functions\\api\\controls.js"
import { onRequestGet as __api_score_js_onRequestGet } from "C:\\Users\\Hackathons\\Sub Build\\code_base\\PromptStrike\\functions\\api\\score.js"
import { onRequestPost as __api_score_js_onRequestPost } from "C:\\Users\\Hackathons\\Sub Build\\code_base\\PromptStrike\\functions\\api\\score.js"

export const routes = [
    {
      routePath: "/api/controls",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_controls_js_onRequestGet],
    },
  {
      routePath: "/api/score",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_score_js_onRequestGet],
    },
  {
      routePath: "/api/score",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_score_js_onRequestPost],
    },
  ]