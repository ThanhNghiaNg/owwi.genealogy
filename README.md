# Owwi Genealogy

Owwi Genealogy là ứng dụng web giúp xây dựng và trực quan hóa cây phả hệ theo cách đơn giản, dễ thao tác và phù hợp để dùng trực tiếp trên trình duyệt.

Phiên bản hiện tại tập trung vào trải nghiệm quản lý cây gia đình ở phía client: tạo người đầu tiên, mở rộng quan hệ, chỉnh sửa thông tin, sắp xếp thứ tự anh chị em và điều hướng cây bằng thao tác kéo/thả, cuộn chuột hoặc chạm.

## Điểm nổi bật

- Tạo và mở rộng cây phả hệ trực tiếp trên giao diện
- Thêm quan hệ:
  - con
  - cha/mẹ
  - vợ/chồng
- Chỉnh sửa thông tin cá nhân của từng thành viên
- Xóa thành viên khỏi cây
- Sắp xếp lại thứ tự con trong cùng gia đình
- Hiển thị rõ quan hệ cha/mẹ - con và vợ chồng
- Điều hướng canvas bằng pan, zoom và reset viewport
- Lưu dữ liệu cục bộ trên trình duyệt bằng `localStorage`

## Công nghệ sử dụng

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI
- Lucide React
- next-themes
- Vercel Analytics
- MongoDB Node.js Driver

## Kiến trúc hiện tại

Ứng dụng hiện chạy theo mô hình client-side.

- Dữ liệu được lưu trong `localStorage`
- Key lưu trữ hiện tại: `family-tree-db`
- State chính được quản lý bằng `useReducer`
- Bố cục cây được tính toán ở frontend bằng layout engine tự xây dựng
- Đã có backend foundation cơ bản cho health check MongoDB
- Dữ liệu cây hiện vẫn đang được lưu ở `localStorage`

### Mô hình dữ liệu

Dữ liệu được tổ chức thành hai nhóm chính:

- `persons`: thông tin cá nhân
- `relationships`: các mối quan hệ như `parent` và `spouse`

Một số file quan trọng:

- `lib/family-tree/database.ts`: lưu trữ và truy vấn dữ liệu
- `lib/family-tree/reducer.ts`: state và action của ứng dụng
- `lib/family-tree/layout-engine.ts`: tính toán vị trí hiển thị của cây
- `lib/mongodb.ts`: reusable MongoDB connection
- `app/api/health/db/route.ts`: API health check cho MongoDB

## Cấu trúc thư mục chính

```text
app/
  layout.tsx
  page.tsx
  family-tree.css
  api/health/db/route.ts

components/family-tree/
  family-tree-app.tsx
  tree-canvas.tsx
  tree-node.tsx
  connection-lines.tsx
  context-menu.tsx
  add-person-dialog.tsx
  person-form.tsx

lib/
  mongodb.ts

lib/family-tree/
  database.ts
  reducer.ts
  layout-engine.ts
```

## Tính năng hiện có

- Khởi tạo cây từ một người đầu tiên
- Thêm con, cha/mẹ, vợ/chồng
- Cập nhật thông tin cơ bản của từng người:
  - tên
  - giới tính
  - năm sinh
  - biệt danh
  - số điện thoại
  - địa chỉ
  - trạng thái đã mất
- Di chuyển thứ tự con bằng thao tác trái/phải và kéo thả
- Pan và zoom cây trên desktop và thiết bị cảm ứng
- Lưu trạng thái làm việc ngay trên trình duyệt
- Health check backend qua `GET /api/health/db`

## Cài đặt và chạy local

### Yêu cầu

- Node.js 20+
- pnpm
- MongoDB

### Cài đặt dependencies

```bash
pnpm install
```

### Biến môi trường

Tạo file `.env.local` với ít nhất biến sau:

```bash
MONGODB_URI=mongodb://localhost:27017/owwi-genealogy
```

Hoặc copy nhanh từ file mẫu:

```bash
cp .env.example .env.local
```

### Chạy môi trường phát triển

```bash
pnpm dev
```

Mở ứng dụng tại:

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

## Cách sử dụng nhanh

1. Mở ứng dụng
2. Chọn **Add First Person** để tạo thành viên đầu tiên
3. Điền thông tin cơ bản
4. Dùng menu trên từng node để thêm hoặc chỉnh sửa quan hệ
5. Dùng chuột hoặc cảm ứng để di chuyển và phóng to/thu nhỏ cây

## Ghi chú triển khai

Một số cấu hình hiện tại đáng lưu ý:

- Metadata trang đang dùng tiêu đề: **Phả hệ | Owwi**
- `next.config.mjs` đang bật `typescript.ignoreBuildErrors: true`
- `next.config.mjs` đang bật `images.unoptimized: true`

## Định hướng production

Để phù hợp hơn với môi trường production trong các phiên bản tiếp theo, các hạng mục nên được ưu tiên gồm:

- chuyển persistence chính từ `localStorage` sang backend
- hỗ trợ import/export dữ liệu phả hệ
- bổ sung test cho data layer, reducer và layout engine
- thống nhất ngôn ngữ giao diện
- cải thiện khả năng tìm kiếm và quản lý cây lớn
