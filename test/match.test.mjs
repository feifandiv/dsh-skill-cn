import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCjk, labelOf, matchSkills, shortDesc } from '../src/match.js';

const skills = [
  { name: 'ff-yushen-duihua', description: '[与神对话] 非凡口述人生回忆录《与神对话》的整理工作流。' },
  { name: 'ff-duibiao-ruku', description: '[对标入库] 对标视频入库统一入口。' },
  { name: 'ff-fupan', description: '[复盘0.1.7] 每日复盘工作流。' },
  { name: 'lark-doc', description: '飞书云文档（Docx / Wiki）内容操作。' },
  { name: 'libretv-play', description: '在本机 LibreTV 里搜索影片并开播。' },
];

test('label comes from the leading bracket tag', () => {
  assert.equal(labelOf(skills[0]), '与神对话');
  assert.equal(labelOf(skills[3]), '');
});

test('non-Chinese queries stay out of this source', () => {
  assert.deepEqual(matchSkills(skills, 'yushen'), []);
  assert.deepEqual(matchSkills(skills, ''), []);
  assert.equal(hasCjk('与神'), true);
  assert.equal(hasCjk('ff'), false);
});

test('exact Chinese name ranks first', () => {
  const hit = matchSkills(skills, '与神对话');
  assert.equal(hit[0].name, 'ff-yushen-duihua');
});

test('partial Chinese name matches', () => {
  assert.equal(matchSkills(skills, '神对话')[0].name, 'ff-yushen-duihua');
  assert.equal(matchSkills(skills, '复盘')[0].name, 'ff-fupan');
});

test('description keywords also match', () => {
  assert.equal(matchSkills(skills, '回忆录')[0].name, 'ff-yushen-duihua');
});

test('skills without a bracket label never mirror the English group', () => {
  const hit = matchSkills(skills, '飞书');
  assert.equal(hit.length, 0);
});

test('shortDesc strips the tag and clips', () => {
  assert.equal(shortDesc('[复盘] 每日复盘工作流。'), '每日复盘工作流。');
  assert.ok(shortDesc('x'.repeat(200)).length <= 65);
});
