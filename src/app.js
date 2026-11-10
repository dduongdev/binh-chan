// ReadingFlow — điều khiển màn hình (LIB/EDT/SET/TCH) trên localStorage.
// Mọi nội dung giáo viên nhập hiển thị dạng text (textContent), không bao giờ innerHTML.
(function () {
  'use strict';

  const Logic = window.Logic;
  const STORAGE_KEY = 'readingflow.readings.v1';

  const el = function (id) { return document.getElementById(id); };

  let readings = [];
  // { reading, questionIndex, mode: 'edit'|'mark', dirty, baselineContent }
  let editing = null;

  /* ---------------- storage ---------------- */

  function loadReadings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
    } catch (e) {
      alert("Couldn't save to local storage (it may be full or blocked).");
    }
  }

  /* ---------------- đối tượng (SPEC §6) ---------------- */

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function newOption() { return { id: Logic.newId(), text: '', order: 0 }; }

  function newQuestion() {
    return {
      id: Logic.newId(), order: 0, prompt: '',
      options: [newOption(), newOption()],
      correctOptionId: null,
      supportingPassage: null,
      keyEvidence: []
    };
  }

  function newReading() {
    return { id: Logic.newId(), title: '', content: '', questions: [], createdAt: Date.now(), updatedAt: Date.now() };
  }

  // Giữ order == vị trí mảng (SPEC §6.1).
  function syncOrders(reading) {
    (reading.questions || []).forEach(function (q, i) {
      q.order = i;
      (q.options || []).forEach(function (o, j) { o.order = j; });
    });
  }

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

  /* ---------------- LIB: My Readings ---------------- */

  function readyBadge(reading) {
    const v = Logic.validatePassage(reading);
    const badge = document.createElement('span');
    badge.className = 'badge ' + (v.ready ? 'ready' : 'draft');
    badge.textContent = v.ready ? 'Ready to teach' : 'Draft';
    return { badge: badge, validation: v };
  }

  function renderLibrary() {
    const list = el('passage-list');
    list.textContent = '';
    const query = (el('lib-search').value || '').trim().toLowerCase();
    const shown = readings.filter(function (r) {
      return !query || (r.title || '').toLowerCase().indexOf(query) !== -1;
    });

    el('library-empty').hidden = readings.length > 0;
    if (readings.length > 0 && shown.length === 0) {
      const li = document.createElement('li');
      li.className = 'passage-item';
      const p = document.createElement('p');
      p.className = 'p-meta';
      p.textContent = 'No readings match your search.';
      li.appendChild(p);
      list.appendChild(li);
    }

    shown.forEach(function (r) {
      const li = document.createElement('li');
      li.className = 'passage-item';

      const info = document.createElement('div');
      info.className = 'p-info';
      const title = document.createElement('h3');
      title.textContent = r.title || '(Untitled)';
      const meta = document.createElement('p');
      meta.className = 'p-meta';
      const count = (r.questions || []).length;
      meta.appendChild(document.createTextNode(count + (count === 1 ? ' question' : ' questions')));
      meta.appendChild(document.createTextNode(' · ' + new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleDateString()));
      const v = readyBadge(r);
      meta.appendChild(v.badge);
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'p-actions';

      const teach = mkBtn('Start Teaching', function () { beginTeaching(r.id); });
      teach.disabled = !v.validation.ready;
      if (!v.validation.ready) teach.title = v.validation.problems.join(' ');
      const edit = mkBtn('Edit', function () { openEditor(r.id); }, 'ghost');
      const del = mkBtn('Delete', function () {
        if (!confirm('Delete this reading? This action cannot be undone.')) return;
        readings = readings.filter(function (x) { return x.id !== r.id; });
        persist();
        renderLibrary();
      }, 'ghost danger');

      actions.append(teach, edit, del);
      li.append(info, actions);
      list.appendChild(li);
    });
  }

  /* ---------------- EDT: Reading Editor ---------------- */

  function openEditor(id) {
    const src = id ? readings.find(function (r) { return r.id === id; }) : null;
    const reading = src ? clone(src) : newReading();
    editing = {
      reading: reading,
      questionIndex: reading.questions.length ? 0 : -1,
      mode: 'edit',
      dirty: false,
      baselineContent: reading.content || ''
    };
    el('ed-status').textContent = '';
    renderEditor();
    showView('editor');
    el('ed-title').focus();
  }

  function renderEditor() {
    const r = editing.reading;
    el('ed-title').value = r.title || '';
    el('ed-content').value = r.content || '';

    const marking = editing.mode === 'mark';
    el('ed-content').hidden = marking;
    el('passage-preview').hidden = !marking;
    el('evidence-tools').hidden = !marking;
    el('ed-hint').hidden = !marking;
    el('btn-mode-edit').className = marking ? 'small ghost' : 'small';
    el('btn-mode-mark').className = marking ? 'small' : 'small ghost';

    renderQuestionTabs();
    renderQuestionForm();
    renderPreview();
    updateValidity();
  }

  function renderQuestionTabs() {
    const box = el('question-tabs');
    box.textContent = '';
    editing.reading.questions.forEach(function (q, i) {
      const b = mkBtn(String(i + 1), function () { selectQuestion(i); }, 'q-tab');
      if (i === editing.questionIndex) b.classList.add('current');
      b.title = q.prompt || 'Question ' + (i + 1);
      box.appendChild(b);
    });
    el('q-prompt').disabled = editing.questionIndex < 0;
    el('btn-add-option').disabled = editing.questionIndex < 0;
  }

  function selectQuestion(i) {
    if (editing.questionIndex === i) return;
    editing.questionIndex = i;
    renderQuestionTabs();
    renderQuestionForm();
    renderPreview();
  }

  function renderQuestionForm() {
    const q = currentQuestion();
    const noQ = !q;

    el('q-prompt').value = q ? (q.prompt || '') : '';
    el('q-prompt').disabled = noQ;

    const box = el('q-options');
    box.textContent = '';
    if (q) {
      q.options.forEach(function (o) { box.appendChild(buildOptionRow(q, o)); });
    }

    el('btn-add-option').disabled = noQ;
    el('btn-move-up').disabled = noQ || editing.questionIndex <= 0;
    el('btn-move-down').disabled = noQ || editing.questionIndex >= editing.reading.questions.length - 1;
    el('btn-delete-question').disabled = noQ;

    renderEvidenceStatus();
  }

  function buildOptionRow(q, o) {
    const row = document.createElement('div');
    row.className = 'opt-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + q.id;
    radio.checked = q.correctOptionId === o.id;
    radio.title = 'Correct answer';
    radio.setAttribute('aria-label', 'Correct answer');
    radio.addEventListener('change', function () {
      q.correctOptionId = o.id;
      markDirty();
      updateValidity();
    });

    const text = document.createElement('input');
    text.type = 'text';
    text.className = 'opt-text';
    text.placeholder = 'Answer option';
    text.setAttribute('aria-label', 'Answer option');
    text.value = o.text || '';
    text.addEventListener('input', function () { o.text = text.value; markDirty(); updateValidity(); });

    const del = mkBtn('\u00d7', function () {
      q.options = q.options.filter(function (x) { return x.id !== o.id; });
      if (q.correctOptionId === o.id) q.correctOptionId = null;
      markDirty();
      renderQuestionForm();
      updateValidity();
    }, 'ghost small opt-remove');
    del.title = 'Remove option';
    del.setAttribute('aria-label', 'Remove option');
    del.disabled = q.options.length <= 2; // bất biến: mỗi câu ≥ 2 lựa chọn

    row.append(radio, text, del);
    return row;
  }

  // Nhãn trạng thái dẫn chứng của câu đang chọn (nội dung chi tiết do Task 4 lo).
  function renderEvidenceStatus() {
    const q = currentQuestion();
    const box = el('q-evidence');
    box.textContent = '';
    if (!q) {
      box.textContent = 'Add a question to attach evidence.';
      return;
    }
    const p1 = document.createElement('p');
    const supportOk = !!q.supportingPassage;
    p1.className = supportOk ? 'yes' : '';
    p1.textContent = (supportOk ? '\u2713 ' : '') + 'Supporting Passage' + (supportOk ? ' selected' : ' not set');
    const p2 = document.createElement('p');
    const n = (q.keyEvidence || []).length;
    p2.className = n > 0 ? 'yes' : '';
    p2.textContent = (n > 0 ? '\u2713 ' : '') + n + ' Key Evidence highlight' + (n === 1 ? '' : 's');
    box.append(p1, p2);
  }

  function currentQuestion() {
    if (!editing || editing.questionIndex < 0) return null;
    return editing.reading.questions[editing.questionIndex] || null;
  }

  function addQuestion() {
    editing.reading.questions.push(newQuestion());
    editing.questionIndex = editing.reading.questions.length - 1;
    markDirty();
    renderQuestionTabs();
    renderQuestionForm();
    renderPreview();
    updateValidity();
  }

  function deleteQuestion() {
    if (!confirm('Delete this question?')) return;
    editing.reading.questions.splice(editing.questionIndex, 1);
    if (editing.questionIndex >= editing.reading.questions.length) {
      editing.questionIndex = editing.reading.questions.length - 1;
    }
    markDirty();
    renderQuestionTabs();
    renderQuestionForm();
    renderPreview();
    updateValidity();
  }

  function moveQuestion(delta) {
    const qs = editing.reading.questions;
    const i = editing.questionIndex;
    const j = i + delta;
    if (j < 0 || j >= qs.length) return;
    const tmp = qs[i]; qs[i] = qs[j]; qs[j] = tmp;
    editing.questionIndex = j;
    markDirty();
    renderQuestionTabs();
    renderQuestionForm();
    updateValidity();
  }

  // Xem trước khi ở chế độ Mark Evidence (Task 4 thay bằng dẫn chứng 2 cấp).
  function renderPreview() {
    const preview = el('passage-preview');
    preview.textContent = editing ? (editing.reading.content || '') : '';
  }

  function markDirty() {
    if (!editing) return;
    editing.dirty = true;
    el('ed-status').textContent = 'Unsaved changes';
  }

  function updateValidity() {
    if (!editing) return;
    const v = Logic.validatePassage(editing.reading);
    const node = el('ed-valid');
    node.textContent = v.ready ? 'Ready to teach' : 'Draft \u2014 ' + v.problems.join(' ');
    node.className = 'status ' + (v.ready ? 'ok' : 'warn');
    const teach = el('btn-editor-teach');
    teach.disabled = !v.ready;
    teach.title = v.ready ? '' : v.problems.join(' ');
  }

  // SPEC §6.5: sửa nội dung khi đã có dẫn chứng → cảnh báo rồi xóa toàn bộ dẫn chứng.
  function reconcileContent() {
    if (!editing) return true;
    const r = editing.reading;
    if ((r.content || '') === editing.baselineContent) return true;
    const hasEvidence = r.questions.some(function (q) {
      return !!q.supportingPassage || (q.keyEvidence || []).length > 0;
    });
    if (hasEvidence && !confirm('Editing this passage will clear the existing evidence highlights. Continue?')) {
      r.content = editing.baselineContent;
      el('ed-content').value = editing.baselineContent;
      renderPreview();
      return false;
    }
    if (hasEvidence) {
      r.questions.forEach(function (q) { q.supportingPassage = null; q.keyEvidence = []; });
    }
    editing.baselineContent = r.content || '';
    markDirty();
    renderPreview();
    renderQuestionForm();
    updateValidity();
    return true;
  }

  function setMode(mode) {
    if (!editing || editing.mode === mode) return;
    if (mode === 'mark' && !reconcileContent()) return;
    editing.mode = mode;
    renderEditor();
  }

  function saveEditor() {
    if (!editing) return;
    if (!reconcileContent()) return;
    const r = editing.reading;
    syncOrders(r);
    r.updatedAt = Date.now();
    const i = readings.findIndex(function (x) { return x.id === r.id; });
    if (i >= 0) readings[i] = r; else readings.push(r);
    persist();
    editing.dirty = false;
    el('ed-status').textContent = 'Reading saved';
    updateValidity();
  }

  function leaveEditor() {
    if (editing.dirty && !confirm('You have unsaved changes.')) return;
    editing = null;
    renderLibrary();
    showView('library');
  }

  /* ---------------- SET + TCH: teaching (Task 5) ---------------- */

  function beginTeaching(id) {
    const src = readings.find(function (r) { return r.id === id; });
    if (!src) return;
    const v = Logic.validatePassage(src);
    if (!v.ready) { alert(v.problems.join('\n')); return; }
    el('teach-title').textContent = src.title || 'Start Teaching';
    showView('teaching');
  }

  /* ---------------- khởi tạo ---------------- */

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  function init() {
    readings = loadReadings();

    el('btn-create').addEventListener('click', function () { openEditor(null); });
    el('btn-editor-back').addEventListener('click', leaveEditor);
    el('btn-editor-save').addEventListener('click', saveEditor);
    el('btn-editor-teach').addEventListener('click', function () {
      if (!editing) return;
      saveEditor();
      beginTeaching(editing.reading.id);
    });
    el('btn-mode-edit').addEventListener('click', function () { setMode('edit'); });
    el('btn-mode-mark').addEventListener('click', function () { setMode('mark'); });
    el('btn-add-question').addEventListener('click', addQuestion);
    el('btn-add-option').addEventListener('click', function () {
      const q = currentQuestion();
      if (!q) return;
      q.options.push(newOption());
      markDirty();
      renderQuestionForm();
      updateValidity();
    });
    el('btn-move-up').addEventListener('click', function () { moveQuestion(-1); });
    el('btn-move-down').addEventListener('click', function () { moveQuestion(1); });
    el('btn-delete-question').addEventListener('click', deleteQuestion);
    el('btn-fullscreen').addEventListener('click', toggleFullscreen);
    el('btn-teach-exit').addEventListener('click', function () {
      editing = null;
      renderLibrary();
      showView('library');
    });

    el('lib-search').addEventListener('input', renderLibrary);
    el('ed-title').addEventListener('input', function () {
      editing.reading.title = el('ed-title').value;
      markDirty();
      updateValidity();
    });
    el('ed-content').addEventListener('input', function () {
      editing.reading.content = el('ed-content').value;
      markDirty();
      updateValidity();
    });
    el('q-prompt').addEventListener('input', function () {
      const q = currentQuestion();
      if (!q) return;
      q.prompt = el('q-prompt').value;
      markDirty();
      renderQuestionTabs();
      updateValidity();
    });

    window.addEventListener('beforeunload', function (e) {
      if (editing && editing.dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    renderLibrary();
    showView('library');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
