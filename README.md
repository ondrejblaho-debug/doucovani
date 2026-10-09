# Doučování – přijímačky CERMAT 2027 (PWA)

Offline-first výuková aplikace pro přípravu na jednotné přijímací zkoušky (CERMAT) 2027 –
dvě trasy: **8leté gymnázium (5. třída)** a **6leté gymnázium (7. třída)**, volitelné moduly
*Test z křesťanské kultury* (8leté) a *Angličtina* (6leté, ve výchozím stavu zapnutá).
Profily si každý vytvoří při prvním spuštění; všechna data zůstávají jen v zařízení (localStorage).

Stack: Vite + Preact + TypeScript, bez runtime CDN. Výstup `dist/` (statické soubory, base `/doucovani/`, přepsatelné `BASE=/ npm run build`).

## Příkazy
    npm install
    npm run build      # validace banku + generátorů + klíčů CERMAT → tsc → vite build → dist/sw.js
    npm run preview    # http://localhost:4173/doucovani/
    npm run e2e        # Playwright, iPhone 13 (WebKit + Chromium pro offline test), screenshoty do screenshots/
    npm run validate   # jen validace (3000 seedů na generátor; SEEDS=… pro jiný počet)

## Struktura
- `bank/*.txt` – původní úlohy v jednoduchém DSL (kompiluje `scripts/compile-bank.ts`); `@listen` = poslech (čte hlas zařízení)
- `src/gen/math.ts` – parametrické generátory matematiky; `src/gen/czech.ts` – ručně psané slovní seznamy
- `src/content/cards.ts` – vysvětlující karty ke každému tématu
- `data/curriculum.json` – anonymní plán (týdny, témata, testy nanečisto) podle trasy; `data/keys.json` – klíče CERMAT
- `src/lib/plan.ts`, `lesson.ts` – denní plán, skládání lekce, opakování chyb (Leitner 1/3/7/14/30 dní)
- `src/lib/mock.ts` – bodování testů nanečisto
- `scripts/validate.ts`, `scripts/check-mock.ts` – automatické kontroly (spouští se při každém buildu)
- Záloha JSON / kód `DOUC1Z.…` v sekci Rodič (výchozí PIN 1234).

Testovací přepnutí data: `?today=2026-10-12` v URL nebo `localStorage['doucovani:today']`.
