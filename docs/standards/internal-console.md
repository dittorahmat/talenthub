# Enterprise Operator & Superadmin Console Standards

Dokumen standar desain dan implementasi untuk halaman operator internal, portal Superadmin (`src/pages/SuperadminPortal.tsx`), dan konsol manajemen backend di TalentHub.

## 1. Zero-Exemption Rule
- Halaman operator internal dilarang diperlakukan sebagai kanvas prototyping bebas aturan.
- Wajib dibangun sebagai **Enterprise Operator Console** berstandar tinggi: kontras jelas, label kompak, kontainer tegas, tanpa dekorasi emoji atau kartu warna-warni tanpa fungsi.

## 2. Layout, Shell, & Card Framing
- **Page Shell**: Gunakan kanvas lapang terstruktur: `max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-10 space-y-8`. Dilarang menumpuk section tanpa vertical gap yang lega.
- **Card Framing**: Setiap panel utama (KPI, Formulir Mutasi, Tabel Data, Log Audit) WAJIB dibungkus kontainer kartu mandiri:
  `bg-white border border-slate-200 rounded-xl shadow-xs p-6 md:p-8`.
  Dilarang menyatukan metrik atau tabel dalam satu lembar flat tanpa card frame terpisah.
- **Form Grid & Controls**: Formulir input wajib dipecah menjadi baris-baris terstruktur jika memiliki catatan teks/alasan audit. Dilarang menjejalkan dropdown, nominal, text description, dan tombol submit ke dalam satu baris sempit. Tombol aksi form wajib memiliki tinggi standar proporsional (`py-2.5 px-4`).
- **Table Cell Padding**: Sel tabel data (`th`, `td`) wajib memiliki ruang vertikal dan horizontal yang nyaman (`py-4 px-6`), dilarang menggunakan padding sel yang rapat/gepeng (`py-1` s/d `py-2`).

## 3. Theme & Styling
- **Light Slate Palette**: Seluruh halaman operator wajib patuh pada palet Light Slate & Teal:
  - Background halaman: `#F8FAFC`
  - Kontainer / panel: `bg-white border border-slate-200`
  - Aksen primer: `teal-600` / `teal-700`
  - Teks: primer `slate-900`, sekunder `slate-500`, border `slate-200`
- **Zero Inline Styles**: Dilarang menggunakan `style={{ ... }}` pada elemen atau tombol interaktif. Seluruh styling wajib menggunakan utility class Tailwind v4.
- **No Decorative Emojis**: Dilarang menyematkan emoji (`🛡️`, `🔒`, `⚡`, `🏢`, `🔄`, `✕`, `⚠`) di tombol, header, atau kartu. Selalu gunakan ikon SVG monokrom semantik atau tipografi tegas.

## 4. Strict Domain Modeling
- **Zero Primitive Obsession**: Seluruh struktur data tampilan (antrean, list item, tabel transaksi) wajib memiliki interface domain kanonik yang tegas. Dilarang menggunakan `any`, `any[]`, atau type assertion sembarangan (`as CreditTransactionType`, `as any`).
- **Side-Effect Free Controls**: Tombol utilitas preset form (seperti `+50`, `+100`) hanya mengisi input form secara reaktif tanpa memicu mutasi backend implisit.
