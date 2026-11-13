/**
 * Browser half: a second "/" source that finds skills by their Chinese name.
 *
 * DSH's built-in skill source ranks by skill *name* only (an ASCII, kebab-case
 * identifier), so a Chinese query such as "与神对话" can never match. The menu
 * contract supports a second search key — `label` — so this source returns the
 * same skills with their Chinese name as the label: typing "/与神对话" now
 * matches, and picking inserts the real "/ff-…" token exactly like the built-in
 * group does.
 */

const inject = ["inputTriggers", "sessions", "remote", "remote.skills", "locale"];

const SOURCE_NAME = "skill-cn";

function describeError(result) {
  if (result && result.error) return result.error.code + ": " + result.error.message;
  return "unknown error";
}

function skillCnApply(ctx) {
  const sessions = ctx.sessions;
  const skillsRemote = ctx.remote && ctx.remote.skills;
  const inputTriggers = ctx.get("inputTriggers");
  if (!inputTriggers || !skillsRemote) {
    console.error("[skill-cn] missing inputTriggers or remote.skills; source not registered");
    return;
  }

  /** sessionId -> Promise<skills[]>; cleared on failure and on teardown. */
  const cache = new Map();

  async function listSkills(sessionId, signal) {
    const call = async () => {
      const result = await skillsRemote.list({ sessionId }, signal);
      if (!result || result.ok !== true) throw new Error(describeError(result));
      return result.value.skills || [];
    };
    const using = sessions && typeof sessions.using === "function";
    return using
      ? await sessions.using(sessionId, { source: "skill-cn", signal }, call)
      : await call();
  }

  function fetchSkills(sessionId, signal) {
    const existing = cache.get(sessionId);
    if (existing !== undefined) return existing;
    const promise = Promise.resolve()
      .then(() => listSkills(sessionId, signal))
      .catch((error) => {
        cache.delete(sessionId);
        throw error;
      });
    cache.set(sessionId, promise);
    return promise;
  }

  function isSubagent(sessionId) {
    try {
      return typeof sessions.subagentAddress === "function"
        && sessions.subagentAddress(sessionId) !== undefined;
    } catch (error) {
      return false;
    }
  }

  const source = {
    trigger: "/",
    name: SOURCE_NAME,
    order: 3,
    async candidates(session, request) {
      const query = String((request && request.query) || "");
      if (!hasCjk(query)) return [];
      if (!session || isSubagent(session.sessionId)) return [];
      const signal = request && request.signal;
      try {
        const skills = await fetchSkills(session.sessionId, signal);
        if (signal && signal.aborted) return [];
        return matchSkills(skills, query).slice(0, 15).map((skill) => ({
          name: skill.name,
          label: labelOf(skill),
          description: shortDesc(skill.description),
        }));
      } catch (error) {
        console.error("[skill-cn] skill catalog unavailable:", error);
        return [];
      }
    },
    warm(session) {
      if (!session || isSubagent(session.sessionId)) return;
      fetchSkills(session.sessionId).catch(() => {});
    },
    onPick(pick) {
      return { text: "/" + pick.candidate.name + " " };
    },
  };

  ctx.effect(() => {
    const dispose = inputTriggers.registerSource(source);
    return () => {
      dispose();
      cache.clear();
    };
  }, "skill-cn: chinese skill source");

  ctx.effect(() => {
    try {
      return ctx.locale.register("slash.menu", {
        zh: { [SOURCE_NAME]: "技能 · 中文" },
        en: { [SOURCE_NAME]: "Skills · 中文" },
      });
    } catch (error) {
      /* A missing dictionary only leaves the raw group id visible. */
      console.warn("[skill-cn] group title stays untranslated:", error);
      return () => {};
    }
  }, "skill-cn: menu dictionary");
}
