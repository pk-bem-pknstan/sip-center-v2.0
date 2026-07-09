Feed Instagram sekarang bisa ditarik dari CSV/Google Sheet.

Kolom yang didukung:
- order: urutan tampil
- active: TRUE/FALSE
- url: link post Instagram
- image: link gambar thumbnail/poster
- title: alt/judul singkat
- html: opsional, boleh paste full <a class="sbi_photo">...</a>; sistem akan ambil href dan data-full-res/src otomatis.

Website hanya menampilkan 3 baris aktif pertama berdasarkan order.
Untuk Google Sheet, publish sheet sebagai CSV lalu pasang URL-nya di CONFIG.instagramUrl. Sekarang URL dapat memakai link Google Sheet pubhtml; sistem akan membacanya sebagai CSV otomatis.
