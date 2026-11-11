# AGENTS.md

Hướng dẫn cho agent khi làm việc trong repo này. **Nguồn sự thật là `docs/MVP_SPEC.md`** (v2.4) — đọc trước khi implement, không tự suy diễn thêm. `docs/UI_SPEC.md` là tài liệu bổ trợ về hình ảnh/copy; khi xung đột, `MVP_SPEC.md` điều khiển hành vi, `UI_SPEC.md` điều khiển trình bày.

## 1. Dự án

**ReadingFlow** — ứng dụng web giúp **giáo viên tiếng Anh** chuẩn bị bài đọc và điều khiển buổi học Reading trên lớp (dùng trên máy tính, có thể trình chiếu). Giáo viên điều khiển hoàn toàn; học sinh không đăng nhập, không dùng thiết bị riêng. Toàn bộ UI tiếng Anh (SPEC §9).

- 4 khu vực: **`LIB`** My Readings · **`EDT`** Reading Editor · **`SET`** Teaching Setup · **`TCH`** Teaching Session (SPEC §3.1). `SET` và `TCH` là hai chặng của cùng một luồng giảng dạy.
- Luồng chính: tạo bài trong thư viện → nhập tiêu đề → thêm câu hỏi trắc nghiệm theo thứ tự → dán **excerpt của câu đó** → đánh dấu **Key Evidence** một cấp trong excerpt → **Start Teaching** → nhập tên học sinh → quay vòng → **Keep/Remove** → hiện câu hỏi (ẩn excerpt, đáp án) → **Reveal Answer** (chỉ hiện đáp án) → **Show Excerpt** (hiện excerpt plain) → **Show Key Evidence** (hiện dẫn chứng) → **Next Question** → Lesson Complete. Học sinh trả lời bằng lời, không cần thiết bị.
- Lưu trữ: bài đọc lưu bền vững trên cùng môi trường sử dụng; trạng thái buổi học **không** cần khôi phục sau reload.
- Chỉ làm trong phạm vi MVP. Mọi thứ ở **SPEC §2.2** (đăng nhập/phân quyền, đồng bộ nhiều thiết bị, chấm điểm/thống kê, AI tạo câu hỏi, PDF/Word/OCR, mobile, dạng câu hỏi khác…) là ngoài phạm vi — không tự thêm.

## 2. Stack

- **Frontend:** HTML + CSS thuần (vanilla), **kèm JavaScript thuần** — không framework, không bundler, không build step. JS là bắt buộc cho hành vi động (vòng quay, công bố đáp án, chọn/bỏ highlight theo vùng bôi đen, thêm/xóa lựa chọn); HTML/CSS thuần không làm được.
- **Lưu trữ:** `localStorage` cục bộ — bài đọc lưu bền vững; trạng thái buổi học chỉ trong phiên.
- **Không backend, không phụ thuộc mạng, không đồng bộ nhiều thiết bị** (đúng phạm vi MVP).

Code hiện có:

- `index.html` + `styles.css` — khung UI tĩnh.
- `src/app.js` — điều khiển màn hình, `localStorage`, quay vòng (vanilla JS).
- `src/logic.js` — logic thuần (không DOM), có test ở `tests/logic.test.js`.
- Code đã theo **SPEC v2.4**: bài học chỉ gồm tiêu đề + từng câu hỏi, mỗi câu có `passage` (excerpt) riêng và `keyEvidence[]` một cấp bên trong excerpt; không lưu hay hiển thị toàn bài đọc. Khi dạy, excerpt ẩn cho tới **Show Excerpt**, dẫn chứng ẩn cho tới **Show Key Evidence**. Lưu ở `readingflow.readings.v2`; dữ liệu `v1` cũ bị bỏ qua, không migrate/xoá. Khu vực `LIB/EDT/SET/TCH`, cơ chế **Keep/Remove** giữ nguyên.

## 3. Bất biến nghiệp vụ (không được vi phạm)

- Mỗi câu hỏi: **≥ 2 lựa chọn** có nội dung và **đúng chính xác 1** đáp án (số lựa chọn linh hoạt, không cố định A/B/C/D).
- Dẫn chứng gắn **theo từng câu hỏi** với **một cấp duy nhất**: **Key Evidence** — 0 hoặc nhiều vùng nằm trong `question.passage` của chính câu đó, đậm/nổi hơn. Highlight là **tuỳ chọn**, không ảnh hưởng Ready. Khi sửa/duyệt câu X chỉ hiện excerpt và dẫn chứng của X, không lộ của câu khác (EVD-01..13).
- Lộ dần theo từng bước: **Reveal Answer** chỉ hiện đáp án đúng; **Show Excerpt** mới hiện excerpt plain; **Show Key Evidence** mới hiện dẫn chứng. Không bước nào được lộ nội dung của bước sau (TCH-04, TCH-05, TCH-06, EVD-13).
- Sang câu mới: reset `selectedStudentId = null`, phase về `spin`; mọi lớp reveal ẩn lại (SPEC §7, TCH-07).
- Vòng quay chọn **đều xác suất** từ danh sách **đang active**; **KHÔNG** tự loại học sinh sau khi quay (không auto no-repeat). Chỉ **Remove** mới loại khỏi các vòng sau **trong phiên**; **Keep** giữ lại; **Spin Again** không đổi roster (SPN-01..09). Hết học sinh active → disable Spin + `Restore All Students` (SPN-10, SPN-11).
- Offset dẫn chứng dùng **nửa mở** `[startOffset, endOffset)`, `0 <= startOffset < endOffset <= passage.length`, theo chỉ số **UTF-16** của `question.passage` canonical; suy ra từ vùng bôi đen DOM, **không** dùng `indexOf` (cụm từ có thể lặp lại nhiều lần).
- Sửa excerpt của một câu khi đã có dẫn chứng → cảnh báo rõ; nếu xác nhận thì chỉ xóa dẫn chứng của **câu đó**, không tự căn chỉnh offset (SPEC §6.5). Cancel khôi phục text cũ và giữ dẫn chứng.
- Chỉ cho **Start Teaching** khi bài đọc hợp lệ (đủ 6 điều kiện SPEC §5: tiêu đề, ≥ 1 câu, prompt, ≥ 2 lựa chọn, đúng 1 đáp án, excerpt không trống); bài thiếu vẫn lưu nháp được.
- Không lưu, không hiển thị, không trình chiếu toàn bài đọc ở bất kỳ đâu; mỗi câu chỉ có excerpt riêng.
- Mọi nội dung giáo viên nhập hiển thị dạng **text**, không thực thi HTML/script.

## 4. Skill dùng trong dự án này

| Skill | Dùng khi |
|---|---|
| `ponytail` (đang bật, mức `full`) | Mọi tác vụ code: thay đổi nhỏ nhất giải quyết trọn vẹn, ưu tiên tái dùng thứ đã có, không thêm abstraction/dependency không được yêu cầu. |
| `ponytail-review` | Trước commit/PR: soi diff + code liên quan (bug, bảo mật, tải thực, test thiếu, chỗ cắt). |
| `ponytail-audit` | Kiểm tra sức khỏe toàn repo khi cần. |
| `ponytail-debt` | Thu hoạch các comment `shortcut:` đã trì hoãn. |

Không liên quan dự án này: `aidoc-management` (Spring Boot / AI-Doc). `opencode`, `report`, `find-skills` chỉ dùng khi làm việc với chính OpenCode.

Với logic có rẽ nhánh / vòng lặp / parser / offset văn bản / bảo mật: để lại **một test nhỏ**. Không cắt validation, xử lý lỗi mất dữ liệu, bảo mật.

## 5. Phối hợp với gitnexus (MCP)

gitnexus dùng để điều hướng đồ thị code thay cho grep mù. **Repo `binh-chan` chưa được index** — index trước khi dùng:

```bash
gitnexus analyze          # index lần đầu; --force để index lại, --pdg nếu cần luồng dữ liệu/taint
```

Quy trình gợi ý, ghép với ponytail:

1. **Hiểu trước khi sửa** (ponytail luôn đọc code liên quan): `query` để tìm luồng theo khái niệm → `context` xem 1 symbol (caller/callee) → `trace` xem A tới B qua đường nào.
2. **Trước khi sửa symbol/hub**: `impact` (risk LOW→CRITICAL, `d=1` là WILL BREAK) → `api_impact` cho route handler. Đổi tên dùng `rename` (theo đồ thị, an toàn hơn find/replace).
3. **Trước commit**: `detect_changes` (diff → symbol/process bị ảnh hưởng) và `check` (phát hiện vòng lặp import). Sau đó chạy `ponytail-review`.
4. **Nâng cao khi cần**: `cypher` truy vấn cấu trúc, `shape_check`/`route_map` nếu có API, `explain`/`pdg_query` nếu index kèm `--pdg`. Schema đồ thị: resource `gitnexus://repo/binh-chan/schema`.

Lưu ý: gitnexus index theo repo; sau khi đổi nhiều file, `gitnexus analyze` lại để đồ thị khỏi lệch. Kiểm tra `staleness` bằng `list_repos` khi kết quả nghi ngờ.

## 6. Lệnh

Không có bước build. Chạy app bằng cách mở `index.html`, hoặc serve tĩnh khi cần (tránh ràng buộc `file://`):

```bash
npx serve .            # hoặc: python -m http.server 8080
```

Kiểm thử: thủ công theo **AC-01..AC-20** (SPEC §10). Logic thuần ở `src/logic.js` có test tự động:

```bash
node --test tests/logic.test.js
```
