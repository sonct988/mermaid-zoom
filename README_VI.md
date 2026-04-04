# 🔍 Mermaid Zoom

> **Obsidian Plugin** — Zoom, kéo và điều hướng diagram Mermaid trong một popup toàn màn hình.  

---
## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Popup toàn màn hình** | Mở diagram trong overlay có thể zoom và kéo thoải mái |
| **Zoom nhiều mức** | Scroll chuột hoặc nhấn nút `+` / `−`, từ 20% đến 500% |
| **Giữ nguyên độ zoom** | Zoom không reset khi di chuyển — trạng thái luôn được lưu |
| **Drag to pan** | Giữ chuột trái và kéo để di chuyển diagram |
| **Fit to window** | Tự động scale vừa màn hình khi mở popup |
| **Mặc định `max-width: 100%`** | Diagram nhỏ và vừa hiển thị đẹp ngay trong note, không bị vỡ layout |
| **Touch support** | Pinch-to-zoom và drag 1 ngón trên mobile / tablet |

---

## Cài đặt

Plugin chưa có trên Community Plugins — cài thủ công:

### Bước 1 — Copy file vào vault

```
<vault>/.obsidian/plugins/mermaid-zoom/
├── main.js
├── styles.css
└── manifest.json
```

### Bước 2 — Bật plugin

Obsidian → **Settings** → **Community Plugins** → tắt **Restricted Mode** nếu chưa tắt → tìm **Mermaid Zoom** → **Enable**


---

## Cách dùng

### Mở popup

Hover chuột vào bất kỳ diagram Mermaid nào — nút **⤢ Zoom** sẽ hiện bên dưới diagram.

Hoặc dùng phím tắt: **`Ctrl + Click`** vào diagram.

### Điều khiển trong popup

#### Bằng chuột / trackpad

| Thao tác | Kết quả |
|---|---|
| **Scroll chuột** | Zoom vào/ra tại vị trí con trỏ |
| **Giữ chuột trái + kéo** | Di chuyển (pan) |
| Click ngoài popup | Đóng popup |

#### Bằng bàn phím

| Phím | Hành động |
|---|---|
| `+` hoặc `=` | Zoom in |
| `-` hoặc `_` | Zoom out |
| `0` | Reset về 100% và vị trí gốc |
| `F` | Fit vừa cửa sổ |
| `Esc` | Đóng popup |

#### Bằng nút toolbar


| Nút | Chức năng |
|---|---|
| `−` / `+` | Zoom out / Zoom in từng bước 20% |
| `100%` | Hiển thị mức zoom hiện tại |
| `⟳` | Reset zoom về 100%, về vị trí gốc |
| `⊡` | Fit diagram vừa cửa sổ popup |
| `✕` | Đóng popup |

#### Trên mobile / tablet

| Thao tác | Kết quả |
|---|---|
| **Pinch 2 ngón** | Zoom in / out |
| **Kéo 1 ngón** | Di chuyển diagram |

---

## Giới hạn zoom

| Thông số | Giá trị |
|---|---|
| Zoom tối thiểu | 20% |
| Zoom tối đa | 500% |
| Mỗi bước zoom | 20% |

