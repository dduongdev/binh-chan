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

test('passageSegments: one highlight level, contiguous slices rebuild the excerpt exactly', function () {
  const text = 'Hello world';
  assert.deepStrictEqual(Logic.passageSegments(text, [{ startOffset: 0, endOffset: 5 }]), [
    { startOffset: 0, endOffset: 5, level: 'key' },
    { startOffset: 5, endOffset: 11, level: 'text' }
  ]);
  assert.strictEqual(
    Logic.passageSegments(text, [{ startOffset: 0, endOffset: 5 }])
      .map(function (s) { return text.slice(s.startOffset, s.endOffset); }).join(''),
    text);

  // Overlapping or adjacent highlights merge into one.
  assert.deepStrictEqual(
    Logic.passageSegments(text, [{ startOffset: 0, endOffset: 3 }, { startOffset: 3, endOffset: 5 }]),
    [{ startOffset: 0, endOffset: 5, level: 'key' }, { startOffset: 5, endOffset: 11, level: 'text' }]);

  // Out-of-range ranges are dropped, not clamped.
  assert.deepStrictEqual(Logic.passageSegments('abc', [{ startOffset: 0, endOffset: 9 }]),
    [{ startOffset: 0, endOffset: 3, level: 'text' }]);

  // No highlights -> one text slice.
  assert.deepStrictEqual(Logic.passageSegments('abc', []),
    [{ startOffset: 0, endOffset: 3, level: 'text' }]);

  // UTF-16: a surrogate pair is one 2-code-unit slice, never split.
  const emoji = 'A\u{1F600}B';
  assert.deepStrictEqual(Logic.passageSegments(emoji, [{ startOffset: 1, endOffset: 3 }]), [
    { startOffset: 0, endOffset: 1, level: 'text' },
    { startOffset: 1, endOffset: 3, level: 'key' },
    { startOffset: 3, endOffset: 4, level: 'text' }
  ]);
});

test('validatePassage: excerpt required, key evidence optional', function () {
  function question() {
    return {
      prompt: 'Q', passage: 'Hello world', correctOptionId: 'a',
      options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
      keyEvidence: []
    };
  }
  const base = { title: 'T', questions: [question()] };
  assert.strictEqual(Logic.validatePassage(base).ready, true); // no content, no highlights

  const withKey = JSON.parse(JSON.stringify(base));
  withKey.questions[0].keyEvidence = [{ startOffset: 0, endOffset: 5 }];
  assert.strictEqual(Logic.validatePassage(withKey).ready, true);

  const noExcerpt = JSON.parse(JSON.stringify(base));
  noExcerpt.questions[0].passage = '   ';
  const v = Logic.validatePassage(noExcerpt);
  assert.strictEqual(v.ready, false);
  assert.ok(v.problems.some(function (p) { return p.indexOf('reading excerpt') !== -1; }));

  // Invalid ranges are filtered at render time and never block readiness.
  const staleKey = JSON.parse(JSON.stringify(base));
  staleKey.questions[0].keyEvidence = [{ startOffset: 0, endOffset: 99 }];
  assert.strictEqual(Logic.validatePassage(staleKey).ready, true);

  const noTitle = JSON.parse(JSON.stringify(base));
  noTitle.title = '';
  assert.strictEqual(Logic.validatePassage(noTitle).ready, false);
  assert.strictEqual(Logic.validatePassage({ title: 'T', questions: [] }).ready, false);
});

test('pickIndex: uniform range and -1 when empty', function () {
  assert.strictEqual(Logic.pickIndex(3, function () { return 0; }), 0);
  assert.strictEqual(Logic.pickIndex(3, function () { return 0.999; }), 2);
  assert.strictEqual(Logic.pickIndex(0), -1);
});

test('wheelRotation: the winner sector stops under the top pointer', function () {
  [1, 2, 5, 7, 12].forEach(function (count) {
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      const rot = Logic.wheelRotation(i, count, 0);
      const mid = (i + 0.5) * step;
      const landed = ((mid + rot) % 360 + 360) % 360;
      assert.ok(landed < 1e-9 || landed > 360 - 1e-9, 'sector ' + i + '/' + count + ' lands at ' + landed);
      // A jitter inside the sector keeps the pointer on that same sector.
      const jitter = (step - 6) / 2;
      const jittered = ((mid + Logic.wheelRotation(i, count, jitter)) % 360 + 360) % 360;
      assert.ok(jittered < step / 2 || jittered > 360 - step / 2);
    }
  });
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
