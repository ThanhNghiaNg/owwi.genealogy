# Owwi Genealogy

Ứng dụng web để xây dựng và xem cây phả hệ theo cách trực quan.

Project hiện được xây bằng **Next.js 16 + React 19 + TypeScript**, tập trung vào trải nghiệm thao tác trực tiếp trên cây gia đình: thêm người, thêm cha/mẹ, thêm vợ/chồng, chỉnh sửa thông tin, sắp xếp thứ tự anh chị em và điều hướng canvas bằng kéo/thả, cuộn chuột hoặc pinch zoom.

## Tính năng chính

- Tạo cây phả hệ bắt đầu từ người đầu tiên
- Thêm:
  - con
  - vợ/chồng
  - cha/mẹ
- Chỉnh sửa thông tin từng người:
  - tên
  - giới tính
  - năm sinh
  - biệt danh
  - số điện thoại
  - địa chỉ
  - trạng thái đã mất
- Xóa người khỏi cây
- Sắp xếp lại thứ tự con bằng:
  - di chuyển trái/phải
  - kéo thả giữa các anh chị em
- Hiển thị quan hệ:
  - cha/mẹ - con
  - vợ chồng
- Canvas tương tác:
  - pan bằng kéo chuột / chạm
  - zoom bằng con lăn chuột
  - pinch zoom trên thiết bị cảm ứng
  - reset viewport
- Lưu dữ liệu ngay trên trình duyệt bằng `localStorage`

## Kiến trúc hiện tại

Ứng dụng đang là **client-side app**.

- Dữ liệu được lưu trong `localStorage` với key: `family-tree-db`
- Không có backend production trong phần app Next.js hiện tại
- Layout cây được tính ở frontend bằng engine tự viết
- State được quản lý bằng `useReducer`

### Mô hình dữ liệu

Dữ liệu được tổ chức theo 2 tập chính:

- `persons`
- `relationships`

Trong đó:

- `persons` chứa thông tin cá nhân
- `relationships` chứa quan hệ kiểu:
  - `parent`
  - `spouse`

File chính cho data layer:

- `lib/family-tree/database.ts`

## Cấu trúc thư mục đáng chú ý

```text
app/
  layout.tsx                # Root layout của Next.js
  page.tsx                  # Entry page, render FamilyTreeApp
  family-tree.css           # CSS chính cho giao diện cây phả hệ

components/family-tree/
  family-tree-app.tsx       # App shell
  tree-canvas.tsx           # Canvas, pan/zoom, node rendering
  tree-node.tsx             # UI cho từng người trong cây
  connection-lines.tsx      # SVG line cho quan hệ
  context-menu.tsx          # Menu thao tác trên node
  add-person-dialog.tsx     # Dialog thêm người
  person-form.tsx           # Form chỉnh sửa chi tiết

lib/family-tree/
  database.ts               # Persistence + query helper
  reducer.ts                # App state + actions
  layout-engine.ts          # Tính toán vị trí node/line
```

## Cách chạy local

### Yêu cầu

- Node.js 20+ (khuyến nghị bản mới)
- pnpm

### Cài đặt

```bash
pnpm install
```

### Chạy môi trường dev

```bash
pnpm dev
```

Sau đó mở:

<http://localhost:3000>

### Build production

```bash
pnpm build
pnpm start
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Cách dùng nhanh

1. Mở ứng dụng
2. Nhấn **Add First Person** để tạo người đầu tiên
3. Điền thông tin cơ bản
4. Dùng menu trên từng node để:
   - chỉnh sửa
   - thêm con
   - thêm vợ/chồng
   - thêm cha/mẹ
   - xóa
5. Dùng chuột hoặc cảm ứng để pan/zoom cây

## Ghi chú kỹ thuật

- App title hiện tại: **Phả hệ | Owwi**
- Phần mô tả metadata: *Build and visualize your family tree with an interactive drag-and-drop interface*
- `next.config.mjs` hiện đang bật:
  - `typescript.ignoreBuildErrors: true`
  - `images.unoptimized: true`
- Một số text trong UI đang pha trộn giữa tiếng Việt và tiếng Anh; README này mô tả theo trạng thái code hiện tại

## Tình trạng repo hiện tại

Repo hiện chủ yếu xoay quanh giao diện web cây phả hệ. Ngoài ra còn có một vài file rời như `app.py` và `test_app.py` không phản ánh luồng chính của ứng dụng Next.js hiện tại.

## Hướng phát triển hợp lý tiếp theo

Nếu tiếp tục phát triển project này, các bước đáng làm nhất là:

- thêm backend / đồng bộ dữ liệu nhiều thiết bị
- import/export dữ liệu phả hệ
- tìm kiếm người trong cây
- hỗ trợ quan hệ phức tạp hơn
- chuẩn hóa toàn bộ UI sang một ngôn ngữ duy nhất
- bổ sung test cho reducer, database layer và layout engine

## Công nghệ sử dụng

- Next.js 16
- React 19
- TypeScript
- Radix UI
- Lucide React
- Tailwind CSS 4
- next-themes
- Vercel Analytics

## License

Chưa thấy file license trong repo. Nếu đây là repo public, nên bổ sung `LICENSE` để làm rõ quyền sử dụng.
