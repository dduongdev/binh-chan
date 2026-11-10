const test = require('node:test');
const assert = require('node:assert');
const Logic = require('../src/logic.js');

test('normalizeStudentList: cắt khoảng trắng, bỏ dòng trống, bỏ trùng (không phân biệt hoa/thường)', function () {
  const res = Logic.normalizeStudentList(' An \n\n bình\nAn\n  Bình  \nChi ');
  assert.deepStrictEqual(res.names, ['An', 'bình', 'Chi']);
  assert.deepStrictEqual(res.duplicates, ['An', 'Bình']);
});

test('normalizeStudentList: gộp tên trùng sau khi chuẩn hóa khoảng trắng bên trong', function () {
  const res = Logic.normalizeStudentList('Mary  Ann\nMary Ann\nmary   ann');
  assert.deepStrictEqual(res.names, ['Mary  Ann']);
  assert.strictEqual(res.duplicates.length, 2);
});

test('pickIndex: nằm trong khoảng và trả -1 khi rỗng', function () {
  assert.strictEqual(Logic.pickIndex(3, function () { return 0; }), 0);
  assert.strictEqual(Logic.pickIndex(3, function () { return 0.999; }), 2);
  assert.strictEqual(Logic.pickIndex(0, function () { return 0.5; }), -1);
});

test('validRange: kiểm tra offset', function () {
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 3 }, 'abcd'), true);
  assert.strictEqual(Logic.validRange({ startOffset: 2, endOffset: 2 }, 'abcd'), false);
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 5 }, 'abcd'), false);
});

test('validatePassage: bài hợp lệ thì ready, thiếu điều kiện thì không', function () {
  const base = {
    title: 'T',
    content: 'Hello world',
    questions: [{
      content: 'Q',
      options: [{ content: 'a', isCorrect: true }, { content: 'b', isCorrect: false }],
      highlights: [{ startOffset: 0, endOffset: 5 }]
    }]
  };
  assert.strictEqual(Logic.validatePassage(base).ready, true);
  assert.strictEqual(Logic.validatePassage(Object.assign({}, base, { title: '' })).ready, false);

  const noCorrect = JSON.parse(JSON.stringify(base));
  noCorrect.questions[0].options[0].isCorrect = false;
  assert.strictEqual(Logic.validatePassage(noCorrect).ready, false);

  const badRange = JSON.parse(JSON.stringify(base));
  badRange.questions[0].highlights = [{ startOffset: 0, endOffset: 999 }];
  assert.strictEqual(Logic.validatePassage(badRange).ready, false);
});

test('validatePassage: cho phép 3, 5, 6 lựa chọn với đúng 1 đáp án (AC-02)', function () {
  const p = { title: 'T', content: 'abcdef', questions: [{ content: 'Q', highlights: [{ startOffset: 0, endOffset: 2 }], options: [] }] };
  [3, 5, 6].forEach(function (n) {
    p.questions[0].options = Array.from({ length: n }, function (_, i) { return { content: 'opt' + i, isCorrect: i === 1 }; });
    assert.strictEqual(Logic.validatePassage(p).ready, true, n + ' lựa chọn');
  });
  p.questions[0].options = Array.from({ length: 4 }, function (_, i) { return { content: 'opt' + i, isCorrect: i < 2 }; });
  assert.strictEqual(Logic.validatePassage(p).ready, false);
});
