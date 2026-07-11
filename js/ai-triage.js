// =========================================================
// AI Issue Triage
// -----------------------------------------------------------
// This is a rule-based structured triage engine — safe to use
// with no API key. It fulfils the "Track B: rule-based issue
// classifier is acceptable when secure AI API integration has
// not been covered" allowance in the brief.
//
// TO UPGRADE TO REAL AI LATER:
// Replace the body of runTriage() with a fetch() call to a
// Supabase Edge Function that calls the Anthropic/OpenAI API
// server-side (never put an API key in this frontend file).
// Keep the same return shape so the rest of the app is unchanged.
// =========================================================

const TRIAGE_RULES = [
  {
    test: /leak|water|drip|flood/i,
    category: "Leakage / Performance",
    priority: "High",
    causes: ["Blocked drain line", "Worn seal or gasket", "Condensation build-up"],
    checks: ["Power off the unit if water is near any electrical wiring", "Inspect drainage path for blockage", "Check surrounding area for water damage"]
  },
  {
    test: /spark|smoke|burn|electric shock|wire/i,
    category: "Electrical Safety",
    priority: "Critical",
    causes: ["Damaged wiring or insulation", "Overloaded circuit", "Faulty component"],
    checks: ["Disconnect power immediately", "Do not touch exposed wiring", "Keep area clear until a qualified electrician inspects it"]
  },
  {
    test: /noise|rattle|vibrat|grind/i,
    category: "Mechanical / Performance",
    priority: "Medium",
    causes: ["Loose mounting or fastener", "Worn bearing or fan", "Foreign object in mechanism"],
    checks: ["Observe and note when the noise occurs", "Check visible fasteners and panels", "Avoid continued use if noise worsens"]
  },
  {
    test: /flicker|no display|screen|hdmi|no signal|projector|monitor/i,
    category: "Electronics / Display",
    priority: "Medium",
    causes: ["Loose or damaged cable", "Faulty port", "Failing display component"],
    checks: ["Reseat all cables", "Try an alternate cable or port", "Check for visible cable damage"]
  },
  {
    test: /cool|hvac|ac |air condition|hot|temperature|weak cooling/i,
    category: "HVAC",
    priority: "High",
    causes: ["Dirty or clogged filter", "Refrigerant leak", "Frozen coil"],
    checks: ["Turn unit off and inspect filter", "Check for ice build-up on coils", "Verify vents are unobstructed"]
  },
  {
    test: /crack|broken|damage|not working|dead|won.?t (turn|start)/i,
    category: "General Fault",
    priority: "Medium",
    causes: ["Physical damage", "Internal component failure", "Power supply issue"],
    checks: ["Confirm power source is functioning", "Inspect for visible physical damage", "Avoid forcing any moving parts"]
  }
];

const DEFAULT_RULE = {
  category: "General Maintenance",
  priority: "Medium",
  causes: ["Normal wear and tear", "Requires on-site inspection to confirm"],
  checks: ["Document the issue with a photo if possible", "Avoid operating the asset if unsafe"]
};

/**
 * runTriage(complaintText, assetContext) -> structured suggestion object
 * assetContext: { name, category, location, condition }
 */
function runTriage(complaintText, assetContext = {}) {
  const text = complaintText || "";
  const rule = TRIAGE_RULES.find(r => r.test.test(text)) || DEFAULT_RULE;

  // Build a professional title from the asset name + key phrase
  const firstClause = text.split(/[.,;]/)[0].trim();
  const title = assetContext.name
    ? `${assetContext.name}: ${capitalize(firstClause).slice(0, 70)}`
    : capitalize(firstClause).slice(0, 70);

  const isCritical = /spark|smoke|burn|electric shock|fire|gas smell/i.test(text);

  return {
    title: title || "Reported maintenance issue",
    category: rule.category,
    priority: isCritical ? "Critical" : rule.priority,
    possible_causes: rule.causes,
    initial_checks: rule.checks,
    recurring_warning: null, // populated by checkRecurringPattern() if history is available
    safety_note: isCritical
      ? "This issue may involve an electrical or fire hazard. Recommend an immediate qualified-technician response and keep the asset out of use."
      : "Advisory suggestion only — a technician should confirm before acting.",
    source: "rule-based-triage-v1"
  };
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Looks at prior issues for the same asset and flags a recurring pattern.
 * priorIssues: array of { title, category, created_at }
 */
function checkRecurringPattern(priorIssues, currentCategory) {
  if (!priorIssues || priorIssues.length < 2) return null;
  const sameCategory = priorIssues.filter(i => i.category === currentCategory);
  if (sameCategory.length >= 2) {
    return `This asset has ${sameCategory.length} prior issues in the same category (${currentCategory}). Consider a deeper inspection or replacement review.`;
  }
  return null;
}
