# Menerapkan patch ke GitHub repository

File patch disediakan terpisah bersama ZIP hasil revisi: `fancywebsite-latest-update.patch`.

Dari root repository lokal yang isinya sama dengan ZIP terbaru:

```bash
git checkout -b fancy-orange-rework
git apply --check fancywebsite-latest-update.patch
git apply fancywebsite-latest-update.patch
git add -A
git commit -m "Redesign public website and add Discord ticket bridge"
git push -u origin fancy-orange-rework
```

Bila tidak ingin memakai patch, ekstrak ZIP hasil revisi dan timpa seluruh isi repository, lalu jalankan:

```bash
git add -A
git commit -m "Redesign public website and add Discord ticket bridge"
git push
```

Untuk Vercel, hapus override Install Command lama atau gunakan:

```text
pnpm install --frozen-lockfile
```

Kemudian redeploy sekali dengan **Clear build cache**.
