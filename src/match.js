/**
 * Pure matching logic for the Chinese skill search source.
 *
 * Kept free of DOM / React / ctx so it can be unit-tested under Node and
 * inlined verbatim into the browser bundle by build.mjs.
 */

/** Any CJK ideograph: only Chinese queries are routed to this source. */
const CJK = /[\u3400-\u9fff]/;

/** True when `text` contains at least one CJK ideograph. */
export function hasCjk(text) {
  return CJK.test(String(text || ""));
}

/**
 * The bridged skills carry their Chinese name as a leading "[中文名]" tag in
 * the description (e.g. "[与神对话] 非凡口述人生回忆录…"). That tag is the
 * human name the user types, so it becomes the menu label.
 */
export function labelOf(skill) {
  const description = (skill && skill.description) || "";
  const match = /^\[([^\]\n]{1,60})\]/.exec(description);
  return match ? match[1].trim() : "";
}

/** Menu row hint: the description without its bracket tag, clipped. */
export function shortDesc(description) {
  const text = String(description || "")
    .replace(/^\[[^\]]*\]\s*/, "")
    .trim();
  return text.length > 64 ? text.slice(0, 64) + "…" : text;
}

/**
 * Rank skills for a Chinese query.
 *
 * Exact label > label prefix > label substring > description substring; ties
 * keep the host order. Skills without a bracket label are ignored so this
 * group never mirrors the English `skill` group.
 *
 * @param skills - rows from `skills/list` ({ name, description, … }).
 * @param query - raw composer query after "/".
 * @returns matched skills in display order (empty for non-Chinese queries).
 */
export function matchSkills(skills, query) {
  const q = String(query || "").trim().toLowerCase();
  if (q === "" || !hasCjk(q)) return [];
  const hits = [];
  (skills || []).forEach((skill, index) => {
    if (!skill || typeof skill.name !== "string") return;
    const label = labelOf(skill);
    if (label === "") return;
    const lowerLabel = label.toLowerCase();
    const lowerDesc = String(skill.description || "").toLowerCase();
    let score;
    if (lowerLabel === q) score = 0;
    else if (lowerLabel.startsWith(q)) score = 1;
    else if (lowerLabel.includes(q)) score = 2;
    else if (lowerDesc.includes(q)) score = 3;
    else return;
    hits.push({ skill, index, score });
  });
  hits.sort((a, b) => a.score - b.score || a.index - b.index);
  return hits.map((hit) => hit.skill);
}
