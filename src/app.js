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
  // { reading, names, labels, state, spinning, spinToken }
  let session = null;

  /* ---------------- storage ---------------- */

  function loadReadings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(raw) ? raw.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
      return true;
    } catch (e) {
      alert("Couldn't save to local storage (it may be full or blocked).");
      return false;
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
      meta.appendChild(document.createTextNode(' · ' + new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleDateString('en-US')));
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
        if (!persist()) readings = loadReadings();
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
      b.setAttribute('aria-pressed', i === editing.questionIndex ? 'true' : 'false');
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
      el('btn-clear-support').disabled = true;
      el('btn-clear-keys').disabled = true;
      return;
    }
    const p1 = document.createElement('p');
    const supportOk = !!q.supportingPassage;
    p1.className = supportOk ? 'yes' : '';
    p1.textContent = (supportOk ? '\u2713 ' : '') + 'Supporting Passage'
      + (supportOk ? ' selected' : ' not set (optional)');
    const p2 = document.createElement('p');
    const n = (q.keyEvidence || []).length;
    p2.className = n > 0 ? 'yes' : '';
    p2.textContent = (n > 0 ? '\u2713 ' : '') + n + ' Key Evidence highlight' + (n === 1 ? '' : 's');
    box.append(p1, p2);

    el('btn-clear-support').disabled = !supportOk;
    el('btn-clear-keys').disabled = n === 0;
    updateEvidenceButtons();
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

  /* ---------------- EVD: dẫn chứng 2 cấp (SPEC §6.4, EVD-01..13) ---------------- */

  // Dựng nội dung bằng text node + mark (không innerHTML) → an toàn XSS và
  // container.textContent luôn bằng content (offset phụ thuộc điều này).
  function renderPassage(container, content, support, keys) {
    container.textContent = '';
    const text = content || '';
    Logic.passageSegments(text, support, keys).forEach(function (seg) {
      const piece = text.slice(seg.startOffset, seg.endOffset);
      if (seg.level === 'text') {
        container.appendChild(document.createTextNode(piece));
        return;
      }
      const mark = document.createElement('mark');
      mark.textContent = piece;
      if (seg.level === 'key') {
        mark.className = 'mark-key';
        mark.dataset.start = seg.startOffset;
        mark.dataset.end = seg.endOffset;
        mark.title = 'Remove Highlight';
        if (container.id === 'passage-preview') {
          mark.tabIndex = 0;
          mark.setAttribute('role', 'button');
          mark.setAttribute('aria-label', 'Remove Highlight');
        }
      } else {
        mark.className = 'mark-support';
      }
      container.appendChild(mark);
    });
  }

  function renderPreview() {
    if (!editing) return;
    const q = currentQuestion();
    renderPassage(
      el('passage-preview'),
      editing.reading.content || '',
      q ? q.supportingPassage : null,
      q ? q.keyEvidence : []
    );
    updateEvidenceButtons();
  }

  // Vùng bôi đen trong passage-preview → offset UTF-16 nửa mở (không dùng indexOf).
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

  // Trạng thái nút dẫn chứng theo vùng chọn hiện tại: cả hai chỉ cần một vùng bôi đen.
  function updateEvidenceButtons() {
    if (!editing || editing.mode !== 'mark' || el('view-editor').hidden) return;
    const q = currentQuestion();
    const off = selectionOffsets();
    el('btn-set-support').disabled = !q || !off;
    el('btn-key-evidence').disabled = !q || !off;
  }

  function setSupportingPassage() {
    const q = currentQuestion();
    const off = selectionOffsets();
    if (!q || !off || editing.mode !== 'mark') return;
    if (q.supportingPassage
      && q.supportingPassage.startOffset === off.startOffset
      && q.supportingPassage.endOffset === off.endOffset) return;
    q.supportingPassage = off;
    window.getSelection().removeAllRanges();
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
  }

  function addKeyEvidence() {
    const q = currentQuestion();
    const off = selectionOffsets();
    if (!q || !off || editing.mode !== 'mark') return;
    q.keyEvidence = Logic.mergeRanges(q.keyEvidence.concat([off]));
    window.getSelection().removeAllRanges();
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
  }

  function removeKeyEvidence(start, end) {
    const q = currentQuestion();
    if (!q) return;
    // Một vùng key có thể bị cắt thành nhiều mark khi vượt biên Supporting Passage,
    // nên xoá theo chứa đựng (các vùng đã gộp nên không chồng lấn).
    q.keyEvidence = (q.keyEvidence || []).filter(function (r) {
      return !(r.startOffset <= start && r.endOffset >= end);
    });
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
  }

  function clearSupport() {
    const q = currentQuestion();
    if (!q || !q.supportingPassage) return;
    if (!confirm('Clear the Supporting Passage?')) return;
    q.supportingPassage = null;
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
  }

  function clearKeyEvidence() {
    const q = currentQuestion();
    if (!q || !(q.keyEvidence || []).length) return;
    q.keyEvidence = [];
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
  }

  function onPreviewClick(e) {
    if (!editing || editing.mode !== 'mark') return;
    const mark = e.target.closest('mark.mark-key');
    if (!mark) return;
    removeKeyEvidence(Number(mark.dataset.start), Number(mark.dataset.end));
  }

  function onPreviewKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    onPreviewClick(e);
    if (e.target.closest('mark.mark-key')) e.preventDefault();
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
    if (!editing) return false;
    if (!reconcileContent()) return false;
    const r = editing.reading;
    syncOrders(r);
    r.updatedAt = Date.now();
    const i = readings.findIndex(function (x) { return x.id === r.id; });
    if (i >= 0) readings[i] = r; else readings.push(r);
    if (!persist()) { editing.dirty = true; return false; }
    editing.dirty = false;
    el('ed-status').textContent = 'Reading saved';
    updateValidity();
    return true;
  }

  function leaveEditor() {
    if (editing.dirty) {
      if (!confirm('You have unsaved changes.')) return;
      readings = loadReadings(); // bỏ thay đổi: quay về bản đã lưu, không dạy bản nháp
    }
    editing = null;
    renderLibrary();
    showView('library');
  }

  /* ---------------- SET + TCH: teaching (SPEC §4.5, §7) ---------------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WHEEL_PALETTE = ['#168FA4', '#53B8E8', '#F47768', '#F4C95D', '#66BD8A', '#A997DF', '#F7AD4A'];

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function labelFor(id) {
    if (!session || !session.state) return '';
    const i = session.state.students.findIndex(function (s) { return s.id === id; });
    return i >= 0 ? session.labels[i] : '';
  }

  function beginTeaching(id) {
    const src = readings.find(function (r) { return r.id === id; });
    if (!src) return;
    const v = Logic.validatePassage(src);
    if (!v.ready) { alert(v.problems.join('\n')); return; }
    session = { reading: clone(src), names: [], labels: [], state: null, spinning: false, spinToken: 0 };
    editing = null;
    el('teach-title').textContent = 'Start Teaching';
    el('teach-summary').textContent = (src.title || '(Untitled)') + ' \u00b7 '
      + src.questions.length + (src.questions.length === 1 ? ' question' : ' questions');
    el('teach-students').value = '';
    updateSetup();
    el('teach-setup').hidden = false;
    el('teach-session').hidden = true;
    showView('teaching');
    el('teach-students').focus();
  }

  function updateSetup() {
    const raw = el('teach-students').value;
    const names = Logic.parseStudentNames(raw);
    el('teach-count').textContent = names.length + (names.length === 1 ? ' student' : ' students');
    el('setup-error').hidden = names.length > 0 || raw.length === 0;
    el('btn-start-session').disabled = names.length < 1;
  }

  function startSession() {
    const names = Logic.parseStudentNames(el('teach-students').value);
    if (names.length < 1) { el('setup-error').hidden = false; return; }
    session.names = names;
    session.labels = Logic.disambiguate(names);
    session.state = {
      phase: 'spin',
      questionIndex: 0,
      questionCount: session.reading.questions.length,
      students: names.map(function (n) { return { id: Logic.newId(), name: n, isActive: true }; }),
      selectedStudentId: null
    };
    session.spinning = false;
    el('teach-title').textContent = session.reading.title || 'Start Teaching';
    el('teach-setup').hidden = true;
    el('teach-session').hidden = false;
    renderSession();
  }

  function renderSession() {
    const s = session.state;
    el('teach-progress').textContent = 'Question ' + (s.questionIndex + 1) + ' of ' + s.questionCount;
    el('stage-spin').hidden = s.phase !== 'spin';
    el('stage-selected').hidden = s.phase !== 'selected';
    el('stage-question').hidden = s.phase !== 'question' && s.phase !== 'revealed';
    el('stage-done').hidden = s.phase !== 'completed';

    if (s.phase === 'spin') renderSpinStage();
    else if (s.phase === 'selected') el('sel-name').textContent = labelFor(s.selectedStudentId);
    else if (s.phase === 'question' || s.phase === 'revealed') renderQuestionStage(s.phase === 'revealed');
    else if (s.phase === 'completed') {
      el('done-count').textContent = "You've finished all " + s.questionCount + ' questions.';
    }
  }

  function renderSpinStage() {
    const active = session.state.students.filter(function (s) { return s.isActive; });
    const empty = active.length === 0;
    el('spin-roster').textContent = active.length
      + (active.length === 1 ? ' student on the wheel' : ' students on the wheel');
    el('spin-roster').hidden = empty;
    el('spin-empty').hidden = !empty;
    el('btn-spin').hidden = empty;
    el('btn-spin').disabled = empty;
    buildWheelSVG(active);
  }

  function polar(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function contrastText(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.5 ? '#203548' : '#ffffff';
  }

  function buildWheelSVG(students) {
    const slot = el('wheel-wrap');
    slot.textContent = '';
    const size = 400, c = size / 2, r = size / 2 - 10;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'wheel');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Student selection wheel');

    const rotor = document.createElementNS(SVG_NS, 'g');
    rotor.setAttribute('class', 'wheel-rotor');
    svg.appendChild(rotor);

    const n = students.length;
    if (n === 0) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', c); circle.setAttribute('cy', c); circle.setAttribute('r', r);
      circle.setAttribute('fill', '#e8eaef');
      rotor.appendChild(circle);
    } else if (n === 1) {
      const color = WHEEL_PALETTE[0];
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', c); circle.setAttribute('cy', c); circle.setAttribute('r', r);
      circle.setAttribute('fill', color);
      rotor.appendChild(circle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'wheel-label');
      text.setAttribute('x', c);
      text.setAttribute('y', c);
      text.setAttribute('fill', contrastText(color));
      text.textContent = labelFor(students[0].id);
      rotor.appendChild(text);
    } else {
      const step = 360 / n;
      students.forEach(function (st, i) {
        const deg0 = i * step, deg1 = (i + 1) * step;
        const p0 = polar(c, c, r, deg0), p1 = polar(c, c, r, deg1);
        const color = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M ' + c + ' ' + c + ' L ' + p0.x + ' ' + p0.y
          + ' A ' + r + ' ' + r + ' 0 ' + (step > 180 ? 1 : 0) + ' 1 ' + p1.x + ' ' + p1.y + ' Z');
        path.setAttribute('fill', color);
        rotor.appendChild(path);

        if (n <= 12) {
          const lp = polar(c, c, r * 0.62, (deg0 + deg1) / 2);
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('class', 'wheel-label');
          text.setAttribute('x', lp.x);
          text.setAttribute('y', lp.y);
          text.setAttribute('fill', contrastText(color));
          text.textContent = labelFor(st.id);
          rotor.appendChild(text);
        }
      });
    }
    slot.appendChild(svg);
  }

  function spin() {
    if (!session || !session.state || session.state.phase !== 'spin' || session.spinning) return;
    const active = session.state.students.filter(function (s) { return s.isActive; });
    if (active.length === 0) return;
    const idx = Logic.pickIndex(active.length);
    const winner = active[idx];
    const step = 360 / active.length;
    const jitter = (Math.random() - 0.5) * Math.max(step - 6, 0);
    const target = Logic.wheelRotation(idx, active.length, jitter);

    session.spinning = true;
    const token = ++session.spinToken;
    el('btn-spin').disabled = true;

    const rotor = prefersReducedMotion() ? null : el('wheel-wrap').querySelector('.wheel-rotor');
    if (rotor) {
      rotor.style.transition = 'transform 3s cubic-bezier(.17,.67,.24,1)';
      rotor.style.transform = 'rotate(' + target + 'deg)';
    }
    const finish = function () {
      if (!session || token !== session.spinToken) return;
      session.spinning = false;
      session.state = Logic.reduce(session.state, { type: 'SPIN', winnerId: winner.id });
      renderSession();
    };
    if (rotor) setTimeout(finish, 3050); else finish();
  }

  function renderQuestionStage(revealed) {
    const s = session.state;
    const q = session.reading.questions[s.questionIndex];
    el('teach-student').textContent = labelFor(s.selectedStudentId) + ' is answering';
    renderPassage(el('teach-passage'), session.reading.content || '',
      revealed ? q.supportingPassage : null,
      revealed ? q.keyEvidence : []);

    const box = el('teach-question');
    box.textContent = '';
    const prompt = document.createElement('p');
    prompt.className = 'teach-q-content';
    prompt.textContent = q.prompt || '';
    const ul = document.createElement('ul');
    ul.className = 'teach-options';
    (q.options || []).forEach(function (o) {
      const li = document.createElement('li');
      li.textContent = o.text || '';
      if (revealed && o.id === q.correctOptionId) {
        li.classList.add('correct');
        const label = document.createElement('span');
        label.className = 'correct-label';
        label.textContent = 'Correct Answer';
        li.appendChild(label);
      }
      ul.appendChild(li);
    });
    box.append(prompt, ul);

    el('btn-reveal').hidden = revealed;
    el('btn-next').hidden = !revealed;
    el('btn-next').textContent = s.questionIndex >= s.questionCount - 1 ? 'Finish Lesson' : 'Next Question';
  }

  function applyAction(action) {
    if (!session || !session.state) return;
    session.state = Logic.reduce(session.state, action);
    renderSession();
  }

  function spinAgain() {
    if (!session || !session.state || session.state.phase !== 'selected') return;
    const active = session.state.students.filter(function (s) { return s.isActive; });
    if (active.length === 0) return;
    applyAction({ type: 'SPIN_AGAIN', winnerId: active[Logic.pickIndex(active.length)].id });
  }

  function teachAgain() {
    if (!session) return;
    const names = session.names.join('\n');
    beginTeaching(session.reading.id);
    el('teach-students').value = names;
    updateSetup();
  }

  function exitTeaching() {
    if (session && session.state && session.state.phase !== 'completed'
      && !confirm('Exit the lesson in progress?')) return;
    session = null;
    editing = null;
    renderLibrary();
    showView('library');
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
      if (!saveEditor()) return;
      beginTeaching(editing.reading.id);
    });
    el('btn-mode-edit').addEventListener('click', function () { setMode('edit'); });
    el('btn-mode-mark').addEventListener('click', function () { setMode('mark'); });
    el('btn-set-support').addEventListener('click', setSupportingPassage);
    el('btn-key-evidence').addEventListener('click', addKeyEvidence);
    el('btn-clear-support').addEventListener('click', clearSupport);
    el('btn-clear-keys').addEventListener('click', clearKeyEvidence);
    // Giữ vùng bôi đen khi bấm nút (mousedown mặc định sẽ xóa selection).
    ['btn-set-support', 'btn-key-evidence'].forEach(function (id) {
      el(id).addEventListener('mousedown', function (e) { e.preventDefault(); });
    });
    el('passage-preview').addEventListener('click', onPreviewClick);
    el('passage-preview').addEventListener('keydown', onPreviewKey);
    document.addEventListener('selectionchange', updateEvidenceButtons);
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
    el('btn-teach-exit').addEventListener('click', exitTeaching);
    el('teach-students').addEventListener('input', updateSetup);
    el('btn-start-session').addEventListener('click', startSession);
    el('btn-spin').addEventListener('click', spin);
    el('btn-spin-again').addEventListener('click', spinAgain);
    el('btn-keep').addEventListener('click', function () { applyAction({ type: 'KEEP' }); });
    el('btn-remove').addEventListener('click', function () { applyAction({ type: 'REMOVE' }); });
    el('btn-restore').addEventListener('click', function () { applyAction({ type: 'RESTORE' }); });
    el('btn-reveal').addEventListener('click', function () { applyAction({ type: 'REVEAL' }); });
    el('btn-next').addEventListener('click', function () { applyAction({ type: 'NEXT' }); });
    el('btn-teach-again').addEventListener('click', teachAgain);
    el('btn-back-library').addEventListener('click', exitTeaching);

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
