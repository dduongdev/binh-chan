// Hàm thuần, không phụ thuộc DOM — chạy được cả trong trình duyệt lẫn Node (để test).
(function (root) {
  'use strict';

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- text ranges (SPEC §6.4, §5.1) ---------------- */

  function validRange(r, content) {
    const len = content ? content.length : 0;
    return !!r
      && Number.isInteger(r.startOffset) && Number.isInteger(r.endOffset)
      && r.startOffset >= 0 && r.startOffset < r.endOffset && r.endOffset <= len;
  }

  // Vùng trong nằm hoàn toàn trong vùng ngoài (EVD-06).
  function containedIn(inner, outer) {
    return !!inner && !!outer
      && inner.startOffset >= outer.startOffset && inner.endOffset <= outer.endOffset;
  }

  // Gộp các vùng chồng lấn hoặc kề nhau thành một (SPEC §5.1).
  function mergeRanges(ranges) {
    const sorted = (ranges || []).filter(Boolean).slice()
      .sort(function (a, b) { return a.startOffset - b.startOffset || a.endOffset - b.endOffset; });
    const out = [];
    sorted.forEach(function (r) {
      const last = out[out.length - 1];
      if (last && r.startOffset <= last.endOffset) {
        if (r.endOffset > last.endOffset) last.endOffset = r.endOffset;
      } else {
        out.push({ startOffset: r.startOffset, endOffset: r.endOffset });
      }
    });
    return out;
  }

  /* ---------------- students (SPEC §4.5, SPN-07) ---------------- */

  // Mỗi dòng một tên; bỏ dòng trống; cắt/gộp khoảng trắng; GIỮ trùng (khác id nội bộ).
  function parseStudentNames(text) {
    const names = [];
    String(text == null ? '' : text).split(/\r?\n/).forEach(function (raw) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (name) names.push(name);
    });
    return names;
  }

  // Tên trùng nhau hiển thị kèm (1), (2)... khi quay (SPN-07).
  function disambiguate(names) {
    const total = {};
    const seen = {};
    (names || []).forEach(function (n) {
      const k = String(n).toLowerCase();
      total[k] = (total[k] || 0) + 1;
    });
    return (names || []).map(function (n) {
      const k = String(n).toLowerCase();
      if (total[k] < 2) return n;
      seen[k] = (seen[k] || 0) + 1;
      return n + ' (' + seen[k] + ')';
    });
  }

  /* ---------------- validation (SPEC §5) ---------------- */

  function optionIsFilled(o) { return !!(o && o.text && o.text.trim()); }

  function validatePassage(p) {
    const problems = [];
    if (!p) return { ready: false, problems: ['No reading data.'] };
    if (!p.title || !p.title.trim()) problems.push('Reading title is required.');
    const content = p.content || '';
    if (!content.trim()) problems.push('Passage text is required.');
    const questions = p.questions || [];
    if (questions.length === 0) problems.push('Add at least one question.');
    questions.forEach(function (q, i) {
      const n = i + 1;
      if (!q.prompt || !q.prompt.trim()) problems.push('Question ' + n + ' has no prompt.');
      const filled = (q.options || []).filter(optionIsFilled);
      if (filled.length < 2) problems.push('Question ' + n + ' needs at least two answer options.');
      if (!q.correctOptionId || !filled.some(function (o) { return o.id === q.correctOptionId; })) {
        problems.push('Question ' + n + ' needs exactly one correct answer.');
      }
      const support = q.supportingPassage;
      const supportOk = validRange(support, content);
      if (!supportOk) problems.push('Question ' + n + ' needs a supporting passage.');
      const keys = (q.keyEvidence || []).filter(function (r) {
        return validRange(r, content) && (!supportOk || containedIn(r, support));
      });
      if (keys.length < 1) {
        problems.push('Question ' + n + ' needs at least one key evidence highlight inside the supporting passage.');
      }
    });
    return { ready: problems.length === 0, problems: problems };
  }

  /* ---------------- wheel (SPEC §4.6) ---------------- */

  function pickIndex(poolSize, rand) {
    if (poolSize <= 0) return -1;
    const r = rand ? rand() : Math.random();
    return Math.floor(r * poolSize);
  }

  /* ---------------- session state machine (SPEC §7) ---------------- */

  function reduce(state, action) {
    const a = action || {};
    const s = state;
    if (!s) return s;
    switch (a.type) {
      case 'SPIN':
        if (s.phase !== 'spin' || !a.winnerId) return s;
        return Object.assign({}, s, { phase: 'selected', selectedStudentId: a.winnerId });
      case 'SPIN_AGAIN':
        if (s.phase !== 'selected' || !a.winnerId) return s;
        return Object.assign({}, s, { selectedStudentId: a.winnerId });
      case 'KEEP':
        if (s.phase !== 'selected') return s;
        return Object.assign({}, s, { phase: 'question' });
      case 'REMOVE':
        if (s.phase !== 'selected') return s;
        return Object.assign({}, s, {
          phase: 'question',
          students: s.students.map(function (st) {
            return st.id === s.selectedStudentId ? Object.assign({}, st, { isActive: false }) : st;
          })
        });
      case 'REVEAL':
        if (s.phase !== 'question') return s;
        return Object.assign({}, s, { phase: 'revealed' });
      case 'NEXT':
        if (s.phase !== 'revealed') return s;
        if (s.questionIndex >= s.questionCount - 1) return Object.assign({}, s, { phase: 'completed' });
        return Object.assign({}, s, { phase: 'spin', questionIndex: s.questionIndex + 1, selectedStudentId: null });
      case 'RESTORE':
        return Object.assign({}, s, {
          students: s.students.map(function (st) { return Object.assign({}, st, { isActive: true }); })
        });
      default:
        return s;
    }
  }

  const api = {
    newId: newId,
    validRange: validRange,
    containedIn: containedIn,
    mergeRanges: mergeRanges,
    parseStudentNames: parseStudentNames,
    disambiguate: disambiguate,
    validatePassage: validatePassage,
    pickIndex: pickIndex,
    reduce: reduce
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);