# Ramazan Yıldırım — 3D Portfolio

Scroll ile yönetilen sinematik bir PC montaj deneyimi üzerine kurulu kişisel
portfolyo sitesi. Ana sahne gerçek bir GLB modelini kullanır; kamera, parça
görünürlüğü, ışık ve sıvı soğutucu hareketi tarayıcıda hesaplanır.

## Teknolojiler

- Next.js App Router, React ve TypeScript
- React Three Fiber, Drei ve Three.js
- GSAP ScrollTrigger
- Tailwind CSS

## Yerel geliştirme

```bash
npm install
npm run dev
```

Site varsayılan olarak `http://localhost:3000` adresinde açılır.

Kontroller:

```bash
npm run lint
npm run build
```

Docker ile çalıştırmak için:

```bash
docker compose up --build
```

## Proje yapısı

- `src/app`: sayfa kabuğu, metadata ve global stiller
- `src/components/cinematic/CinematicExperience.tsx`: scroll zaman çizgisi ve HTML katmanları
- `src/components/cinematic/PcCanvas.tsx`: WebGL canvas ve yükleme durumu
- `src/components/cinematic/PcScene.tsx`: GLB sahnesi, kamera, ışık ve parça animasyonları
- `src/components/cinematic/scroll-progress.ts`: React render döngüsünden bağımsız ilerleme kaynağı
- `public/models/portfolio_scene.glb`: PC modeli

## İlk sinematik sekans

Başlangıçta işlemci üstten 90 derece görünür ve çalışma zamanında üretilen `RY`
yüzeyi eski işlemci yazısını kapatır. Scroll ilerledikçe kamera kasayı gösterecek
şekilde geri çekilir. Aynı zaman aralığında sıvı soğutucu işlemciye dik eksende
iner; hortum geometrisi hareket eden bağlantı noktasını izler. Animasyon ters
scroll sırasında aynı zaman çizgisi üzerinden geri sarılır.

GLB dosyası bu aşamada değiştirilmez. Model optimizasyonu ve sonraki montaj
sekansları ayrı adımlar olarak ele alınabilir.
