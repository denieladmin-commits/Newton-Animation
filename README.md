# Newton ágyúgolyója · Newton's Cannonball

Interactive physics app for high-school classes (Hungarian / English): Newton's
cannonball thought experiment with a verified orbital simulation.

**Online:** https://denieladmin-commits.github.io/Newton-Animation/
**Offline:** `dist/index.html` is one self-contained file. Copy it to any computer or
phone and open it in a browser; it needs no internet.

## Rövid útmutató tanároknak

- **Tűz!** kilövi a golyót. A **v₁** gomb körpályát, a **v₂** gomb szökési sebességet állít be.
- **Szimulációs sebesség:** 1× (valós idő), 100×, 500×.
- **Haladó:** Hold és Mars, légellenállás, a sebesség összetevői.
- **Fizika fül:** a levezetés élő számokkal, az energia grafikonja, a jelölések.
- **Ellenőrzés** (a Fizika fül alján): nyolc élő ellenőrzés a pontosságról, nyomtatható.
- **Kivetítés:** H billentyű (bemutató mód). A billentyűparancsok listája: **?**
- Részletes háttér, gyakori kérdések: [docs/TANARI_MEGJEGYZESEK.md](docs/TANARI_MEGJEGYZESEK.md)
- Ellenőrzések és források: [docs/VALIDATION.md](docs/VALIDATION.md)

## Development

```bash
npm install
npm run dev      # local development server
npm test         # physics verification suite
npm run build    # → dist/index.html, a single offline file
```

The design and decisions are in [PLAN.md](PLAN.md).
