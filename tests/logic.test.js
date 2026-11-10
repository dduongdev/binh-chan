const test = require('node:test');
const assert = require('node:assert');
const Logic = require('../src/logic.js');

test('parseStudentNames: trims, drops blanks, keeps duplicates', function () {
  assert.deepStrictEqual(Logic.parseStudentNames(' An \n\n Bình\nAn\n  Bình  \nChi '),
    ['An', 'Bình', 'An', 'Bình', 'Chi']);
});

test('disambiguate: labels repeats with (2),(3) only when duplicated', function () {
  assert.deepStrictEqual(Logic.disambiguate(['An', 'An', 'An', 'Chi']), ['An (1)', 'An (2)', 'An (3)', 'Chi']);
});

test('containedIn: rejects a range crossing the outer edge', function () {
  const outer = { startOffset: 10, endOffset: 20 };
  assert.strictEqual(Logic.containedIn({ startOffset: 12, endOffset: 18 }, outer), true);
  assert.strictEqual(Logic.containedIn({ startOffset: 8, endOffset: 18 }, outer), false);
  assert.strictEqual(Logic.containedIn({ startOffset: 12, endOffset: 22 }, outer), false);
});

test('mergeRanges: merges overlapping AND adjacent, keeps disjoint sorted', function () {
  assert.deepStrictEqual(
    Logic.mergeRanges([{ startOffset: 5, endOffset: 10 }, { startOffset: 10, endOffset: 12 }, { startOffset: 0, endOffset: 3 }]),
    [{ startOffset: 0, endOffset: 3 }, { startOffset: 5, endOffset: 12 }]);
});

test('validRange: half-open bounds inside content', function () {
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 3 }, 'abcd'), true);
  assert.strictEqual(Logic.validRange({ startOffset: 2, endOffset: 2 }, 'abcd'), false);
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 5 }, 'abcd'), false);
});

test('validatePassage: ready only with support + key evidence inside it', function () {
  const base = {
    title: 'T', content: 'Hello world',
    questions: [{ prompt: 'Q', correctOptionId: 'a',
      options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
      supportingPassage: { startOffset: 0, endOffset: 11 },
      keyEvidence: [{ startOffset: 0, endOffset: 5 }] }]
  };
  assert.strictEqual(Logic.validatePassage(base).ready, true);

  const noKey = JSON.parse(JSON.stringify(base));
  noKey.questions[0].keyEvidence = [];
  assert.strictEqual(Logic.validatePassage(noKey).ready, false);

  const keyOutside = JSON.parse(JSON.stringify(base));
  keyOutside.questions[0].supportingPassage = { startOffset: 6, endOffset: 11 };
  assert.strictEqual(Logic.validatePassage(keyOutside).ready, false);
});

test('pickIndex: uniform range and -1 when empty', function () {
  assert.strictEqual(Logic.pickIndex(3, function () { return 0; }), 0);
  assert.strictEqual(Logic.pickIndex(3, function () { return 0.999; }), 2);
  assert.strictEqual(Logic.pickIndex(0), -1);
});

test('reduce: keep vs remove roster effect, and no reveal before REVEAL', function () {
  const s0 = { phase: 'spin', questionIndex: 0, questionCount: 2, selectedStudentId: null,
    students: [{ id: 'a', name: 'A', isActive: true }, { id: 'b', name: 'B', isActive: true }] };

  const sel = Logic.reduce(s0, { type: 'SPIN', winnerId: 'a' });
  assert.strictEqual(sel.phase, 'selected');
  assert.strictEqual(sel.selectedStudentId, 'a');

  assert.strictEqual(Logic.reduce(sel, { type: 'REVEAL' }).phase, 'selected'); // ignored in 'selected'
  const kept = Logic.reduce(sel, { type: 'KEEP' });
  assert.strictEqual(kept.phase, 'question');
  assert.ok(kept.students.every(function (x) { return x.isActive; })); // keep changes nothing

  const removed = Logic.reduce(sel, { type: 'REMOVE' });
  assert.strictEqual(removed.students.find(function (x) { return x.id === 'a'; }).isActive, false);

  const revealed = Logic.reduce(kept, { type: 'REVEAL' });
  assert.strictEqual(revealed.phase, 'revealed');
  const next = Logic.reduce(revealed, { type: 'NEXT' });
  assert.strictEqual(next.phase, 'spin');
  assert.strictEqual(next.questionIndex, 1);
  assert.strictEqual(next.selectedStudentId, null);

  const last = { phase: 'revealed', questionIndex: 1, questionCount: 2, selectedStudentId: 'b', students: s0.students };
  assert.strictEqual(Logic.reduce(last, { type: 'NEXT' }).phase, 'completed');
});

test('reduce: RESTORE reactivates everyone without moving the question', function () {
  const s = { phase: 'spin', questionIndex: 1, questionCount: 2, selectedStudentId: null,
    students: [{ id: 'a', name: 'A', isActive: false }, { id: 'b', name: 'B', isActive: true }] };
  const r = Logic.reduce(s, { type: 'RESTORE' });
  assert.ok(r.students.every(function (x) { return x.isActive; }));
  assert.strictEqual(r.questionIndex, 1);
});
