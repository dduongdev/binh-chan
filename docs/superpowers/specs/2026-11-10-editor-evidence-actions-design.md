# Editor evidence actions — đặt trong ngữ cảnh câu hỏi

Ngày: 2026-11-10 · Trạng thái: chờ duyệt · Quy mô: thay đổi nhỏ

## Ý định và lý do

Giáo viên phàn nàn: 4 nút dẫn chứng (`Set Supporting Passage`, `Highlight Key Evidence`,
`Clear Supporting Passage`, `Clear Key Evidence`) đang nằm ở panel trái (Reading Passage),
nên không rõ chúng áp cho câu hỏi nào. Dẫn chứng trong SPEC gắn **theo từng câu hỏi**, vì vậy
nút phải nằm trong ngữ cảnh câu hỏi đang mở.

## Hiện trạng

- `index.html`: khối `#evidence-tools` (4 nút + `#ed-error`) nằm trong panel trái.
- Panel phải đã có `#q-evidence` — chỉ hiển thị trạng thái (`✓ Supporting Passage selected`,
  `1 Key Evidence highlight`), không có nút.
- UI_SPEC §4.2 mock đã vẽ khối `EVIDENCE` ở panel phải; §4.2.C bước 3 còn mô tả một thanh nổi
  cạnh vùng bôi đen.

## Phương án đã chọn

**Khối cố định dưới câu hỏi** (người dùng chọn). Di chuyển nguyên khối nút sang panel phải,
ngay dưới `#q-evidence`, luôn thuộc câu hỏi đang chọn.

Loại bỏ:
- *Thanh nổi cạnh vùng bôi đen* — trực quan nhưng phải định vị theo toạ độ bôi đen, thêm code
  và dễ lệch khi panel cuộn; panel phải vẫn phải có trạng thái nên tốn hơn mà không rõ hơn.
- *Cả hai chỗ* — hai nơi cùng làm một việc, giáo viên phải chọn một trong hai.

## Thiết kế

1. `index.html`: chuyển `<div id="evidence-tools">` từ panel trái sang panel phải, đặt ngay sau
   `#q-evidence`. Giữ nguyên id của mọi nút và `#ed-error` → `src/app.js` không phải sửa logic.
2. Thêm tiêu đề nhỏ `Evidence` phía trên `#q-evidence` (theo mock UI_SPEC §4.2).
3. Trạng thái dẫn chứng của câu đang chọn hiển thị ở **cả** hai chế độ; 4 nút chỉ hiện ở chế độ
   Mark Evidence (vì cần vùng bôi đen) — giữ nguyên hành vi `hidden` hiện tại.
4. Sửa câu gợi ý ở panel trái (`#ed-hint`) cho khớp vị trí mới: bôi đen trong đoạn văn, rồi dùng
   nút dưới câu hỏi ở panel phải.
5. `styles.css`: bỏ viền/margin kiểu "chân panel trái" của `.evidence-tools`, tạo kiểu khối nút
   trong panel phải; thêm `.evidence-head`.

## Ngoài phạm vi

- Không đổi mô hình dữ liệu, offset, hay luồng chọn dẫn chứng.
- Không thêm nút `Change`/`Clear` mới ngoài 4 nút hiện có.
- Không làm thanh nổi.

## Xác minh

- `node --test tests/logic.test.js` (không đổi, 11 test).
- Chạy lại lượt kiểm thử trình duyệt 71 điểm (Playwright/Edge) sau khi di chuyển; bổ sung 1–2 điểm
  kiểm tra "nút dẫn chứng nằm trong panel Questions và bị ẩn ở chế độ Edit Passage".

## Việc để lại cho người thi hành

- Chọn chính xác thứ tự nút trong khối (giữ như hiện tại: Set, Highlight, Clear support, Clear keys).
- Canh khoảng cách/typography cho khớp các khối khác trong panel phải.
