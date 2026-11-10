# Key Evidence độc lập với Supporting Passage — thiết kế

Ngày: 2026-11-10 · Trạng thái: chờ duyệt · Quy mô: thay đổi vừa (logic + UI + 3 tài liệu nguồn)

## Ý định và lý do

Giáo viên muốn highlight **Key Evidence** ở bất kỳ đâu trong bài đọc, không phải chọn Supporting Passage
trước và không bị chặn khi cụm từ nằm ngoài đoạn đã chọn. Ràng buộc lồng nhau hiện tại (EVD-04, EVD-06,
§5 điều kiện 7–8, UI_SPEC §4.2.C, AGENTS.md §3) cản trở việc đó.

## Phương án đã chọn: B

- **Key Evidence độc lập:** mỗi câu có 0..n vùng trong toàn bài đọc, không ràng buộc nằm trong support.
- **Supporting Passage thành tuỳ chọn:** vẫn tối đa 1 vùng liền mạch mỗi câu; nếu có thì tô nền nhạt.
- **Ready to teach:** bỏ điều kiện "mỗi câu phải có supporting passage"; mỗi câu vẫn cần **≥ 1 key evidence**.
- **Đổi/xoá Supporting Passage không còn xoá Key Evidence.**
- **Không còn "vùng chọn không hợp lệ":** mọi vùng chọn trong bài đều hợp lệ cho cả hai nút, nên nút
  `Highlight Key Evidence` chỉ cần có vùng chọn, và thông báo lỗi dẫn chứng (`#ed-error`) trở nên thừa → xoá.

Đã loại:
- *A (giữ support bắt buộc)* — đúng chữ nhưng không giải quyết việc giáo viên không thiết lập support.
- *C (bỏ hẳn support)* — xoá một nửa tính năng, quá mức yêu cầu.

## Hành vi sau khi đổi

| Tình huống | Trước | Sau |
|---|---|---|
| Bôi đen, chưa có support, bấm `Highlight Key Evidence` | Nút disabled | Nút bật, lưu vùng key |
| Key nằm ngoài support | Bị từ chối | Được lưu |
| Câu chỉ có key, không có support | Draft | **Ready** |
| Đổi/clear support | Xoá sạch key (có confirm) | Key giữ nguyên |
| Clear support | Confirm "…and its Key Evidence?" | Confirm "Clear the Supporting Passage?" |
| Trạng thái support | `Supporting Passage not set` | `Supporting Passage not set (optional)` |
| Key nằm ngoài support khi hiển thị | (không thể) | Vẫn nổi bật trên nền trắng, không có nền vàng |

Rendering (§6.4): key đè lên support khi chồng nhau; ngoài support thì key nổi trên nền thường. Thứ tự
vẽ và cách chia đoạn giữ nguyên, chỉ bỏ bộ lọc "key phải nằm trong support".

## Thay đổi theo file

- `src/logic.js`: `validatePassage` bỏ kiểm tra support, đếm mọi key hợp lệ; `passageSegments` giữ mọi key
  hợp lệ thay vì lọc theo support.
- `src/app.js`: `updateEvidenceButtons` (key chỉ cần vùng chọn), `addKeyEvidence` (bỏ 2 nhánh từ chối),
  `setSupportingPassage` (bỏ confirm + xoá key), `clearSupport` (bỏ xoá key), xoá `showError`/`clearError`,
  cập nhật câu trạng thái.
- `index.html`: xoá `#ed-error`.
- `styles.css`: xoá `.evidence-tools .warn`.
- `tests/logic.test.js`: sửa 2 test hiện có (key ngoài support, support không bắt buộc) + thêm test
  "ready khi chỉ có key".
- `docs/MVP_SPEC.md` (v2.0 → **v2.1**): dòng 10 (ghi chú phiên bản), 22, 33, 58–59, 104–105, 165–166, 169,
  EVD-04/06/07/11, §5 điều kiện 7–8, §5.1, §6.2 (`supportingPassage`/`keyEvidence`), §6.4 bước 2–3,
  AC-04/AC-05.
- `docs/UI_SPEC.md` §4.2.C (bước 1–2, "Behavioral safeguards") và mock `EVIDENCE`.
- `AGENTS.md` §3: viết lại gạch đầu dòng dẫn chứng 2 cấp.
- Script kiểm thử trình duyệt (ngoài repo): AC-05 đổi thành "key ngoài support được lưu"; thêm check
  "câu chỉ có key vẫn Ready" và "màn hình dạy hiện key ngoài support".

## Ngoài phạm vi

- Không cho nhiều supporting passage / nhiều vùng liền mạch khác nhau.
- Không đổi offset nửa mở, luồng Reveal, Keep/Remove, dữ liệu phiên.
- Không thêm cấp highlight thứ ba hay màu tuỳ chỉnh.

## Rủi ro và xử lý

- **Không migration:** bài cũ có support + key vẫn hợp lệ; bài cũ thiếu key vẫn là Draft như trước.
- **Mất ý "2 cấp lồng nhau":** chấp nhận theo yêu cầu; support còn lại là ngữ cảnh tuỳ chọn.
- **Tài liệu nguồn:** nếu không sửa 3 tài liệu, code sẽ trái `MVP_SPEC`/`AGENTS.md`; kế hoạch sửa cả ba.