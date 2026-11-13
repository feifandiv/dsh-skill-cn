/**
 * Smoke test for the built browser bundle: execute client.js under a fake
 * `window.__ModuleLoader__`, wire a fake client context, and drive the "/"
 * source end to end (catalog fetch -> candidate rows -> pick text).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const bundle = await readFile(path.join(root, '..', 'client.js'), 'utf8');

const skills = [
  { name: 'ff-yushen-duihua', description: '[与神对话] 非凡口述人生回忆录《与神对话》的整理工作流。', modelInvocable: true },
  { name: 'ff-fupan', description: '[复盘0.1.7] 每日复盘工作流。', modelInvocable: true },
  { name: 'lark-doc', description: '飞书云文档内容操作。', modelInvocable: true },
];

test('bundle registers a working "/" source', async () => {
  let registered;
  const ctx = {
    get: (name) => (name === 'inputTriggers' ? {
      registerSource: (source) => {
        registered = source;
        return () => {};
      },
    } : undefined),
    sessions: {
      using: async (sessionId, options, fn) => fn({ binding: { session: { getSnapshot: () => ({ openState: 'open' }) } } }),
      subagentAddress: () => undefined,
    },
    remote: {
      skills: {
        list: async () => ({ ok: true, value: { skills } }),
      },
    },
    effect: (fn) => fn(),
    locale: { register: () => {} },
  };

  let exported;
  globalThis.window = {
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        assert.equal(id, '@feifan/dsh-skill-cn');
        exported = factory(() => {
          throw new Error('bundle must not require modules');
        });
      },
    },
  };
  await import('file://' + path.join(root, '..', 'client.js') + '?v=' + Date.now());
  assert.ok(exported, 'bundle registered');
  assert.equal(typeof exported.apply, 'function');
  assert.ok(Array.isArray(exported.inject));

  exported.apply(ctx);
  assert.ok(registered, 'source registered');
  assert.equal(registered.trigger, '/');
  assert.equal(registered.name, 'skill-cn');

  // Chinese query -> only labelled skills, Chinese label carried through.
  const rows = await registered.candidates({ sessionId: 's1' }, { query: '与神对话', signal: { aborted: false } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'ff-yushen-duihua');
  assert.equal(rows[0].label, '与神对话');

  // Latin query -> this source stays silent.
  const latin = await registered.candidates({ sessionId: 's1' }, { query: 'fupan', signal: { aborted: false } });
  assert.deepEqual(latin, []);

  // Picking inserts the real skill token, exactly like the built-in group.
  const pick = registered.onPick({ candidate: rows[0] });
  assert.deepEqual(pick, { text: '/ff-yushen-duihua ' });

  // Missing bracket labels never surface here.
  const feishu = await registered.candidates({ sessionId: 's1' }, { query: '飞书', signal: { aborted: false } });
  assert.deepEqual(feishu, []);
});
