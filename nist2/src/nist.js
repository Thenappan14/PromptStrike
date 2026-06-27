// nist.js
// The authoritative rubric the scanner benchmarks policies against:
// all 72 subcategories of the NIST AI RMF 1.0 (NIST AI 100-1, Jan 2023),
// grouped by function. Intents are condensed from the framework so the
// model assesses against a fixed reference rather than its own memory.

export const NIST = {
  GOVERN: {
    title: "GOVERN — culture, accountability, and oversight structures",
    subs: {
      "GOVERN 1.1": "Legal and regulatory requirements involving AI are understood, managed, and documented.",
      "GOVERN 1.2": "Characteristics of trustworthy AI are integrated into organizational policies, processes, and procedures.",
      "GOVERN 1.3": "Processes determine the level of risk management needed based on the organization's risk tolerance.",
      "GOVERN 1.4": "The risk management process and outcomes are established through transparent policies and accountable practices.",
      "GOVERN 1.5": "Ongoing monitoring and periodic review of the risk management process are planned, with roles defined.",
      "GOVERN 1.6": "Mechanisms are in place to inventory AI systems and are resourced by risk priority.",
      "GOVERN 1.7": "Processes are in place for decommissioning and phasing out AI systems safely.",
      "GOVERN 2.1": "Roles, responsibilities, and lines of communication for AI risk are documented and clear.",
      "GOVERN 2.2": "Personnel and partners receive AI risk management training.",
      "GOVERN 2.3": "Executive leadership takes responsibility for decisions about AI risks.",
      "GOVERN 3.1": "Decision-making across the lifecycle is informed by a diverse team.",
      "GOVERN 3.2": "Policies define and differentiate roles for human-AI configurations and oversight.",
      "GOVERN 4.1": "Policies foster a critical-thinking and safety-first mindset across the lifecycle.",
      "GOVERN 4.2": "Teams document the risks and potential impacts of AI and communicate them broadly.",
      "GOVERN 4.3": "Mechanisms enable testing, incident identification, and information sharing.",
      "GOVERN 5.1": "Policies collect, consider, prioritize, and integrate external feedback.",
      "GOVERN 5.2": "Mechanisms enable AI actors to incorporate feedback from relevant stakeholders.",
      "GOVERN 6.1": "Policies address AI risks from third-party software, data, and supply chain.",
      "GOVERN 6.2": "Contingency processes handle failures or incidents in high-risk third-party AI/data.",
    },
  },
  MAP: {
    title: "MAP — context, categorization, and risk identification",
    subs: {
      "MAP 1.1": "Intended purposes, beneficial uses, context, laws, norms, and settings are documented.",
      "MAP 1.2": "Interdisciplinary AI actors' competencies and skills are represented.",
      "MAP 1.3": "The organization's mission and relevant goals for AI are understood and documented.",
      "MAP 1.4": "Business value or context of business use is understood.",
      "MAP 1.5": "Organizational risk tolerances are determined and documented.",
      "MAP 1.6": "System requirements are elicited and understood from stakeholders.",
      "MAP 2.1": "Tasks and methods the AI system supports are defined.",
      "MAP 2.2": "Knowledge limits and how outputs are used/overseen are documented.",
      "MAP 2.3": "Scientific integrity and TEVV considerations are identified and documented.",
      "MAP 3.1": "Potential benefits of the AI system are examined and documented.",
      "MAP 3.2": "Potential costs, including non-monetary, from errors or behavior are documented.",
      "MAP 3.3": "Targeted application scope is specified and documented.",
      "MAP 3.4": "Processes for operator and practitioner proficiency are documented.",
      "MAP 3.5": "Processes for human oversight are defined and assessed per GOVERN policies.",
      "MAP 4.1": "Approaches to map legal and technology risks of components, incl. third-party, are followed.",
      "MAP 4.2": "Internal risk controls for components, including third-party AI, are documented.",
      "MAP 5.1": "Likelihood and magnitude of each impact are assessed and documented.",
      "MAP 5.2": "Practices for ongoing engagement and integrating impact feedback are documented.",
    },
  },
  MEASURE: {
    title: "MEASURE — analysis, testing, and evaluation (TEVV)",
    subs: {
      "MEASURE 1.1": "Approaches and metrics for measuring AI risks are selected; un-measured risks are documented.",
      "MEASURE 1.2": "Appropriateness of metrics and effectiveness of controls is regularly assessed.",
      "MEASURE 1.3": "Independent assessors / non-front-line experts are involved in measurement.",
      "MEASURE 2.1": "Test sets, metrics, and tooling details are documented.",
      "MEASURE 2.2": "Human-subject evaluations meet requirements and are representative.",
      "MEASURE 2.3": "Performance/assurance criteria are measured for deployment-like conditions.",
      "MEASURE 2.4": "Functionality and behavior are monitored in production.",
      "MEASURE 2.5": "The system is demonstrated valid and reliable; generalizability limits documented.",
      "MEASURE 2.6": "The AI system is evaluated regularly for safety risks.",
      "MEASURE 2.7": "Security and resilience are evaluated and documented.",
      "MEASURE 2.8": "Risks to transparency and accountability are evaluated and documented.",
      "MEASURE 2.9": "The model is explained, validated, and documented to inform responsible use.",
      "MEASURE 2.10": "Privacy risk is evaluated and documented.",
      "MEASURE 2.11": "Fairness and bias are evaluated and results documented.",
      "MEASURE 2.12": "Environmental impact and sustainability are assessed and documented.",
      "MEASURE 2.13": "Effectiveness of TEVV metrics and processes is evaluated and documented.",
      "MEASURE 3.1": "Approaches to track existing, unanticipated, and emergent risks are documented.",
      "MEASURE 3.2": "Risk tracking is considered where empirical measurement is difficult.",
      "MEASURE 3.3": "Feedback processes for users and impacted communities to report/appeal are established.",
      "MEASURE 4.1": "Measurement connects to relevant AI actors incl. domain experts.",
      "MEASURE 4.2": "Deployment-context results are validated by experts and documented.",
      "MEASURE 4.3": "Performance improvements or declines are documented from AI-actor consultation.",
    },
  },
  MANAGE: {
    title: "MANAGE — prioritization, treatment, and response",
    subs: {
      "MANAGE 1.1": "A determination is made whether the AI system meets its purpose and whether to proceed.",
      "MANAGE 1.2": "Treatment of documented risks is prioritized by impact, likelihood, and resources.",
      "MANAGE 1.3": "Responses to high-priority risks are developed, planned, and documented.",
      "MANAGE 1.4": "Negative residual risks to acquirers and end users are documented.",
      "MANAGE 2.1": "Resources to manage risks and viable non-AI alternatives are considered.",
      "MANAGE 2.2": "Mechanisms sustain the value of deployed AI systems.",
      "MANAGE 2.3": "Procedures respond to and recover from newly identified risks.",
      "MANAGE 2.4": "Mechanisms supersede, disengage, or deactivate systems performing inconsistently.",
      "MANAGE 3.1": "Third-party AI risks and benefits are monitored and controls applied.",
      "MANAGE 3.2": "Pre-trained models are monitored as part of maintenance.",
      "MANAGE 4.1": "Post-deployment monitoring plans are implemented (feedback, appeal, override, incident, change).",
      "MANAGE 4.2": "Continual-improvement activities are integrated into updates with stakeholder engagement.",
      "MANAGE 4.3": "Incidents and errors are communicated to relevant AI actors, incl. affected communities.",
    },
  },
};

export const FUNCTIONS = ["GOVERN", "MAP", "MEASURE", "MANAGE"];

// Build the assessment prompt for one function. Scanning one function per
// call keeps each prompt focused and within the model's context window.
export function buildScanPrompt(fn, policyText) {
  const f = NIST[fn];
  const rubric = Object.entries(f.subs)
    .map(([id, intent]) => `- ${id}: ${intent}`)
    .join("\n");

  const system =
    "You are a NIST AI RMF 1.0 compliance auditor. You assess how robustly a " +
    "policy addresses each subcategory of the framework. You judge not merely " +
    "whether a topic is mentioned, but whether it is specified well enough to be " +
    "operable and auditable: named owners, cadences, thresholds, escalation paths, " +
    "and measurable criteria. You never invent facts about the organization. If the " +
    "policy omits something, you mark it a gap rather than assuming it exists. " +
    "Respond ONLY with valid JSON, no preamble, no markdown fences.";

  const user =
`Assess the policy below against the ${fn} function of the NIST AI RMF.

For EACH subcategory listed, rate coverage as one of:
  "covered"  - addressed and specified well enough to be operable/auditable
  "partial"  - mentioned but vague, missing owners/cadences/thresholds, or incomplete
  "missing"  - not addressed at all

Subcategories to assess:
${rubric}

Return JSON in exactly this shape:
{
  "function": "${fn}",
  "items": [
    { "id": "${fn} 1.1", "status": "covered|partial|missing", "finding": "one concise sentence of evidence or gap", "improvement": "one concrete, specific suggestion (or empty string if covered)" }
  ]
}

Keep "finding" and "improvement" under 30 words each. Be specific and concrete, never generic.

POLICY UNDER REVIEW:
"""
${policyText}
"""`;

  return { system, user };
}

// Prompt for generating an enhanced policy section, mapping user inputs into
// the NIST structure. Used by the document-generation flow.
export function buildGeneratePrompt(fn, policyText, orgFields) {
  const f = NIST[fn];
  const rubric = Object.entries(f.subs)
    .map(([id, intent]) => `- ${id}: ${intent}`)
    .join("\n");

  const fields = Object.entries(orgFields || {})
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "(none provided)";

  const system =
    "You are an AI governance policy author. You strengthen a draft policy so it " +
    "aligns to the NIST AI RMF, preserving the framework's function and subcategory " +
    "structure. You NEVER invent organization-specific facts. Where a required detail " +
    "is not supplied, insert a clearly marked placeholder like [PLACEHOLDER: …]. " +
    "Write clear, auditable policy prose with named owners, cadences, and thresholds " +
    "where the source material supports them.";

  const user =
`Produce the ${fn} section of an enhanced AI governance policy in Markdown.

Use these subcategories as the structural baseline (one short subsection each, in order):
${rubric}

Organization-specific fields supplied by the user (use verbatim; do not invent others):
${fields}

Source material from the user's uploaded policy (map relevant content into the structure above):
"""
${policyText}
"""

Rules:
- Preserve NIST function/subcategory alignment and ordering.
- Replace organization-specific fields with the supplied values.
- For any field not supplied, write [PLACEHOLDER: what is needed].
- Do not fabricate names, dates, metrics, or commitments.
- Output Markdown only, starting with "## ${fn}".`;

  return { system, user };
}
