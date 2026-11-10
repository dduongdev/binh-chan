// SCR-02 lưu bài đọc ở localStorage; điều khiển 3 màn hình. Nội dung giáo viên nhập luôn hiển thị dạng text (không innerHTML).
(function () {
  'use strict';

  const Logic = window.Logic;
  const STORAGE_KEY = 'binhchan.passages.v1';

  const el = function (id) { return document.getElementById(id); };

  let passages = [];
  let editing = null;   // { passage, currentQuestion, dirty, baselineContent }
  let selectedMark = null; // { start, end } đánh dấu đang chọn để bỏ
  let session = null;

  /* ---------------- storage ---------------- */

  function loadPassages() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(passages));
    } catch (e) {
      alert("Couldn't save to local storage (it may be full or blocked).");
    }
  }

  /* ---------------- dựng đối tượng ---------------- */

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function newPassage() {
    return { id: Logic.newId(), title: '', content: '', questions: [], createdAt: Date.now(), updatedAt: Date.now() };
  }
  function newOption() { return { id: Logic.newId(), content: '', isCorrect: false }; }
  function newQuestion() { return { id: Logic.newId(), content: '', options: [newOption(), newOption()], highlights: [] }; }
  function overlaps(a, b) { return a.startOffset < b.endOffset && b.startOffset < a.endOffset; }

  function mkBtn(label, handler, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', handler);
    return b;
  }

  function showView(name) {
    ['library', 'editor', 'teaching'].forEach(function (v) { el('view-' + v).hidden = v !== name; });
  }

  /* ---------------- SCR-01: Thư viện ---------------- */

  function renderLibrary() {
    const list = el('passage-list');
    list.textContent = '';
    el('library-empty').hidden = passages.length > 0;

    passages.forEach(function (p) {
      const v = Logic.validatePassage(p);
      const li = document.createElement('li');
      li.className = 'passage-item';

      const info = document.createElement('div');
      info.className = 'p-info';
      const title = document.createElement('h3');
      title.textContent = p.title || '(Untitled)';
      const meta = document.createElement('p');
      meta.className = 'p-meta';
      const count = (p.questions || []).length;
      meta.appendChild(document.createTextNode(count === 1 ? '1 question' : count + ' questions'));
      const badge = document.createElement('span');
      badge.className = 'badge ' + (v.ready ? 'ready' : 'draft');
      badge.textContent = v.ready ? 'Ready to teach' : 'Draft';
      meta.appendChild(badge);
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'p-actions';

      const edit = mkBtn('Edit', function () { openEditor(p.id); }, 'ghost');
      const teach = mkBtn('Start teaching', function () { openTeaching(p.id); });
      teach.disabled = !v.ready;
      if (!v.ready) teach.title = 'Not ready yet: ' + v.problems.join(' ');
      const del = mkBtn('Delete', function () {
        if (confirm('Delete "' + (p.title || '(untitled)') + '"?')) {
          passages = passages.filter(function (x) { return x !== p; });
          persist();
          renderLibrary();
        }
      }, 'ghost danger');

      actions.append(edit, teach, del);
      li.append(info, actions);
      list.appendChild(li);
    });
  }

  /* ---------------- SCR-02: Trình chỉnh sửa ---------------- */

  function openEditor(id) {
    const src = id ? passages.find(function (p) { return p.id === id; }) : null;
    const p = src ? clone(src) : newPassage();
    editing = {
      passage: p,
      currentQuestion: p.questions.length ? 0 : -1,
      dirty: false,
      baselineContent: p.content || ''
    };
    el('ed-title').value = p.title || '';
    el('ed-content').value = p.content || '';
    el('ed-status').textContent = '';
    renderQuestions();
    renderPreview();
    updateCurrentQLabel();
    updateValidity();
    el('btn-unmark').disabled = true;
    showView('editor');
    el('ed-title').focus();
  }

  function leaveEditor() {
    if (editing.dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    editing = null;
    renderLibrary();
    showView('library');
  }

  function markDirty() {
    if (!editing) return;
    editing.dirty = true;
    el('ed-status').textContent = 'Unsaved changes';
  }

  function updateValidity() {
    if (!editing) return;
    const v = Logic.validatePassage(editing.passage);
    const node = el('ed-valid');
    node.textContent = v.ready ? 'Ready to teach' : 'Draft — missing: ' + v.problems.join(' ');
    node.classList.toggle('ok', v.ready);
    node.classList.toggle('warn', !v.ready);
  }

  function updateCurrentQLabel() {
    const q = editing && editing.passage.questions[editing.currentQuestion];
    el('ed-current-q').textContent = q ? ('Question ' + (editing.currentQuestion + 1)) : '— (none selected)';
  }

  function setCurrentQuestion(i) {
    if (!editing || editing.currentQuestion === i) return;
    editing.currentQuestion = i;
    Array.prototype.forEach.call(el('question-list').children, function (card, idx) {
      if (card.classList.contains('q-card')) card.classList.toggle('current', idx === i);
    });
    renderPreview();
    updateCurrentQLabel();
  }

  function renderQuestions() {
    const list = el('question-list');
    list.textContent = '';
    const qs = editing.passage.questions;
    if (!qs.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No questions yet. Add one to get started.';
      list.appendChild(p);
      return;
    }
    qs.forEach(function (q, i) { list.appendChild(buildQuestionCard(q, i)); });
  }

  function buildQuestionCard(q, index) {
    const li = document.createElement('li');
    li.className = 'q-card' + (index === editing.currentQuestion ? ' current' : '');
    li.addEventListener('click', function (e) {
      if (e.target.closest('input, button')) return;
      setCurrentQuestion(index);
    });

    const head = document.createElement('div');
    head.className = 'q-head';
    const tag = document.createElement('span');
    tag.className = 'q-tag';
    tag.textContent = 'Question ' + (index + 1);
    head.appendChild(tag);
    const up = mkBtn('↑', function () { moveQuestion(index, -1); }, 'ghost small');
    up.title = 'Move up';
    up.setAttribute('aria-label', 'Move up');
    head.appendChild(up);
    const down = mkBtn('↓', function () { moveQuestion(index, 1); }, 'ghost small');
    down.title = 'Move down';
    down.setAttribute('aria-label', 'Move down');
    head.appendChild(down);
    head.appendChild(mkBtn('Delete', function () { deleteQuestion(index); }, 'ghost small danger'));
    li.appendChild(head);

    const content = document.createElement('input');
    content.type = 'text';
    content.className = 'q-content';
    content.placeholder = 'Question text';
    content.value = q.content || '';
    content.addEventListener('focus', function () { setCurrentQuestion(index); });
    content.addEventListener('input', function () { q.content = content.value; markDirty(); updateValidity(); });
    li.appendChild(content);

    const opts = document.createElement('div');
    opts.className = 'q-options';
    (q.options || []).forEach(function (o) { opts.appendChild(buildOptionRow(q, o, index)); });
    li.appendChild(opts);

    li.appendChild(mkBtn('+ Add choice', function () {
      q.options.push(newOption());
      markDirty(); updateValidity(); renderQuestions();
    }, 'ghost small'));

    const info = document.createElement('p');
    info.className = 'hint';
    const marks = (q.highlights || []).length;
    info.textContent = 'Evidence: ' + marks + (marks === 1 ? ' mark' : ' marks');
    li.appendChild(info);

    return li;
  }

  function buildOptionRow(q, o, qIndex) {
    const row = document.createElement('div');
    row.className = 'opt-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + q.id;
    radio.checked = !!o.isCorrect;
    radio.title = 'Correct answer';
    radio.addEventListener('focus', function () { setCurrentQuestion(qIndex); });
    radio.addEventListener('change', function () {
      q.options.forEach(function (x) { x.isCorrect = false; });
      o.isCorrect = true;
      markDirty(); updateValidity(); renderQuestions();
    });

    const text = document.createElement('input');
    text.type = 'text';
    text.className = 'opt-text';
    text.placeholder = 'Answer choice';
    text.value = o.content || '';
    text.addEventListener('focus', function () { setCurrentQuestion(qIndex); });
    text.addEventListener('input', function () { o.content = text.value; markDirty(); updateValidity(); });

    const del = mkBtn('×', function () {
      q.options = q.options.filter(function (x) { return x !== o; });
      markDirty(); updateValidity(); renderQuestions();
    }, 'ghost small danger');
    del.title = 'Remove choice';

    row.append(radio, text, del);
    return row;
  }

  function addQuestion() {
    editing.passage.questions.push(newQuestion());
    editing.currentQuestion = editing.passage.questions.length - 1;
    markDirty(); renderQuestions(); renderPreview(); updateCurrentQLabel(); updateValidity();
  }

  function moveQuestion(index, delta) {
    const qs = editing.passage.questions;
    const j = index + delta;
    if (j < 0 || j >= qs.length) return;
    const tmp = qs[index]; qs[index] = qs[j]; qs[j] = tmp;
    if (editing.currentQuestion === index) editing.currentQuestion = j;
    else if (editing.currentQuestion === j) editing.currentQuestion = index;
    markDirty(); renderQuestions(); renderPreview(); updateCurrentQLabel();
  }

  function deleteQuestion(index) {
    if (!confirm('Delete this question?')) return;
    editing.passage.questions.splice(index, 1);
    if (editing.currentQuestion >= editing.passage.questions.length) {
      editing.currentQuestion = editing.passage.questions.length - 1;
    }
    markDirty(); renderQuestions(); renderPreview(); updateCurrentQLabel(); updateValidity();
  }

  /* ---------------- bài đọc + dẫn chứng ---------------- */

  // Dựng nội dung bằng text node/mark (không innerHTML) nên an toàn XSS và textContent === content.
  function renderPassage(container, content, ranges) {
    container.textContent = '';
    const sorted = (ranges || []).slice().sort(function (a, b) { return a.startOffset - b.startOffset; });
    let pos = 0;
    sorted.forEach(function (r) {
      if (r.startOffset < pos || r.endOffset > content.length || r.startOffset >= r.endOffset) return;
      if (r.startOffset > pos) container.appendChild(document.createTextNode(content.slice(pos, r.startOffset)));
      const mark = document.createElement('mark');
      mark.textContent = content.slice(r.startOffset, r.endOffset);
      mark.dataset.start = r.startOffset;
      mark.dataset.end = r.endOffset;
      container.appendChild(mark);
      pos = r.endOffset;
    });
    if (pos < content.length) container.appendChild(document.createTextNode(content.slice(pos)));
  }

  function renderPreview() {
    if (!editing) return;
    const q = editing.passage.questions[editing.currentQuestion];
    renderPassage(el('passage-preview'), editing.passage.content || '', q ? (q.highlights || []) : []);
    selectedMark = null;
    el('btn-unmark').disabled = true;
  }

  function selectionOffsets() {
    const container = el('passage-preview');
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    if (start >= end) return null;
    return { startOffset: start, endOffset: end };
  }

  function updateMarkButton() {
    if (!editing || el('view-editor').hidden) return;
    const off = selectionOffsets();
    el('btn-mark').disabled = !off || editing.currentQuestion < 0;
  }

  function markSelection() {
    const off = selectionOffsets();
    if (!off || !editing || editing.currentQuestion < 0) return;
    const q = editing.passage.questions[editing.currentQuestion];
    q.highlights = q.highlights || [];
    if (q.highlights.some(function (h) { return overlaps(h, off); })) {
      alert('That selection overlaps evidence already marked for this question.');
      return;
    }
    q.highlights.push(off);
    if (window.getSelection) window.getSelection().removeAllRanges();
    markDirty(); renderPreview(); renderQuestions(); updateValidity();
  }

  function onPreviewClick(e) {
    const mark = e.target.closest('mark');
    if (!mark || !editing) return;
    el('passage-preview').querySelectorAll('mark.selected').forEach(function (m) { m.classList.remove('selected'); });
    mark.classList.add('selected');
    selectedMark = { start: Number(mark.dataset.start), end: Number(mark.dataset.end) };
    el('btn-unmark').disabled = false;
  }

  function unmarkSelected() {
    if (!editing || !selectedMark) return;
    const q = editing.passage.questions[editing.currentQuestion];
    if (!q) return;
    q.highlights = (q.highlights || []).filter(function (h) {
      return !(h.startOffset === selectedMark.start && h.endOffset === selectedMark.end);
    });
    markDirty(); renderPreview(); renderQuestions(); updateValidity();
  }

  // AC-09 / SPEC §7.4: sửa nội dung khi đã có dẫn chứng thì phải xác nhận xóa hết.
  function reconcileContent() {
    if (!editing) return true;
    const p = editing.passage;
    if (p.content === editing.baselineContent) return true;
    const hasHighlights = p.questions.some(function (q) { return (q.highlights || []).length; });
    if (hasHighlights && !confirm('The passage text has changed. Remove all existing evidence to avoid misaligned marks?')) {
      p.content = editing.baselineContent;
      el('ed-content').value = editing.baselineContent;
      renderPreview();
      return false;
    }
    if (hasHighlights) p.questions.forEach(function (q) { q.highlights = []; });
    editing.baselineContent = p.content;
    markDirty();
    renderPreview(); renderQuestions(); updateValidity();
    return true;
  }

  function saveEditor() {
    if (!editing) return;
    if (!reconcileContent()) return;
    const p = editing.passage;
    p.updatedAt = Date.now();
    const i = passages.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) passages[i] = p; else passages.push(p);
    persist();
    editing.dirty = false;
    el('ed-status').textContent = 'Saved at ' + new Date().toLocaleTimeString();
  }

  /* ---------------- SCR-03: Phòng giảng dạy ---------------- */

  function openTeaching(id) {
    const src = passages.find(function (p) { return p.id === id; });
    if (!src) return;
    const v = Logic.validatePassage(src);
    if (!v.ready) { alert("This passage isn't ready to teach:\n" + v.problems.join('\n')); return; }
    session = {
      passage: clone(src),
      students: [],
      availableStudents: [],
      currentQuestionIndex: 0,
      selectedStudent: null,
      answerRevealed: false,
      status: 'SETUP',
      spinning: false
    };
    el('teach-title').textContent = src.title || 'Teaching room';
    el('teach-students').value = '';
    el('teach-setup').hidden = false;
    el('teach-session').hidden = true;
    updateStudentCount();
    showView('teaching');
    el('teach-students').focus();
  }

  function updateStudentCount() {
    const res = Logic.normalizeStudentList(el('teach-students').value);
    const n = res.names.length;
    el('teach-count').textContent = n === 1 ? '1 student' : n + ' students';
    el('btn-teach-start').disabled = n < 1;
    el('teach-dupes').textContent = res.duplicates.length
      ? 'Removed ' + res.duplicates.length + (res.duplicates.length === 1 ? ' duplicate name: ' : ' duplicate names: ') + res.duplicates.join(', ')
      : '';
  }

  function startSession() {
    const res = Logic.normalizeStudentList(el('teach-students').value);
    if (res.names.length < 1) return;
    session.students = res.names;
    session.availableStudents = res.names.slice();
    session.currentQuestionIndex = 0;
    session.selectedStudent = null;
    session.answerRevealed = false;
    session.status = 'IN_PROGRESS';
    el('teach-setup').hidden = true;
    el('teach-session').hidden = false;
    renderSession();
  }

  function renderSession() {
    const s = session;
    const q = s.passage.questions[s.currentQuestionIndex];
    const last = s.currentQuestionIndex === s.passage.questions.length - 1;
    const finished = s.status === 'COMPLETED';

    el('teach-progress').textContent = 'Question ' + (s.currentQuestionIndex + 1) + '/' + s.passage.questions.length;

    renderPassage(el('teach-passage'), s.passage.content || '', s.answerRevealed ? (q.highlights || []) : []);

    const qBox = el('teach-question');
    qBox.textContent = '';
    const qContent = document.createElement('p');
    qContent.className = 'teach-q-content';
    qContent.textContent = q.content || '';
    qBox.appendChild(qContent);
    const ul = document.createElement('ul');
    ul.className = 'teach-options';
    (q.options || []).forEach(function (o) {
      const li = document.createElement('li');
      li.textContent = o.content || '(empty)';
      if (s.answerRevealed && o.isCorrect) li.classList.add('correct');
      ul.appendChild(li);
    });
    qBox.appendChild(ul);

    el('spin-name').textContent = s.selectedStudent || '—';
    el('btn-spin').disabled = finished || s.answerRevealed || s.spinning;
    el('btn-spin').textContent = (s.selectedStudent && !s.answerRevealed) ? 'Spin again' : 'Spin';
    el('btn-reveal').disabled = finished || !s.selectedStudent || s.answerRevealed || s.spinning;
    el('btn-next').disabled = finished || !s.answerRevealed;
    el('btn-next').textContent = last ? 'Finish session' : 'Next question';
    el('teach-status').textContent = (last && s.answerRevealed) ? 'Complete' : (s.answerRevealed ? 'Answer revealed' : '');
  }

  function spin() {
    const s = session;
    if (!s || s.answerRevealed || s.spinning || s.status !== 'IN_PROGRESS') return;
    if (s.availableStudents.length === 0) s.availableStudents = s.students.slice();
    const pool = s.availableStudents;
    const winner = pool[Logic.pickIndex(pool.length)];
    s.spinning = true;
    renderSession();

    const out = el('spin-name');
    let ticks = 0;
    const total = 12;
    const timer = setInterval(function () {
      ticks++;
      if (ticks >= total) {
        clearInterval(timer);
        out.textContent = winner;
        s.spinning = false;
        s.selectedStudent = winner;
        renderSession();
        return;
      }
      out.textContent = pool[Math.floor(Math.random() * pool.length)];
    }, 70);
  }

  function revealAnswer() {
    const s = session;
    if (!s || s.answerRevealed || !s.selectedStudent || s.spinning) return;
    s.answerRevealed = true;
    const i = s.availableStudents.indexOf(s.selectedStudent);
    if (i >= 0) s.availableStudents.splice(i, 1); // chỉ tính đã tham gia khi công bố (SPN-06)
    renderSession();
  }

  function nextQuestion() {
    const s = session;
    if (!s || !s.answerRevealed) return;
    if (s.currentQuestionIndex >= s.passage.questions.length - 1) { endSession(); return; }
    s.currentQuestionIndex++;
    s.selectedStudent = null;
    s.answerRevealed = false;
    renderSession();
  }

  function endSession() {
    session = null;
    renderLibrary();
    showView('library');
  }

  function leaveTeaching() {
    if (session && session.status === 'IN_PROGRESS' && !confirm('Leave the session in progress?')) return;
    session = null;
    renderLibrary();
    showView('library');
  }

  /* ---------------- khởi tạo ---------------- */

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  function init() {
    passages = loadPassages();

    el('btn-new-passage').addEventListener('click', function () { openEditor(null); });
    el('btn-editor-back').addEventListener('click', leaveEditor);
    el('btn-editor-save').addEventListener('click', saveEditor);
    el('btn-add-question').addEventListener('click', addQuestion);
    el('btn-mark').addEventListener('click', markSelection);
    el('btn-unmark').addEventListener('click', unmarkSelected);
    el('btn-fullscreen').addEventListener('click', toggleFullscreen);
    el('btn-teach-exit').addEventListener('click', leaveTeaching);
    el('btn-teach-start').addEventListener('click', startSession);
    el('btn-spin').addEventListener('click', spin);
    el('btn-reveal').addEventListener('click', revealAnswer);
    el('btn-next').addEventListener('click', nextQuestion);

    el('ed-title').addEventListener('input', function () {
      editing.passage.title = el('ed-title').value; markDirty(); updateValidity();
    });
    el('ed-content').addEventListener('input', function () {
      editing.passage.content = el('ed-content').value; renderPreview(); markDirty(); updateValidity();
    });
    el('ed-content').addEventListener('change', reconcileContent);

    el('passage-preview').addEventListener('click', onPreviewClick);
    document.addEventListener('selectionchange', updateMarkButton);
    el('teach-students').addEventListener('input', updateStudentCount);

    // SPEC §7.4: cảnh báo trước khi rời trang làm mất thay đổi chưa lưu.
    window.addEventListener('beforeunload', function (e) {
      if (editing && editing.dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    renderLibrary();
    showView('library');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
