# LumaWeb — ako to funguje a ako deployovať

## Zostava

- **Repo:** https://github.com/neear0/9911699467 (branch `main`)
- **Hosting:** GitHub Pages — servíruje priamo obsah `main`, žiadny build, žiadny CI
- **Doména:** lumaweb.sk (+ www)
- **Stack:** čisté HTML/CSS/JS, žiadny framework, žiadne `npm install`

Čokoľvek pushneš do `main`, je za ~1 minútu online. Nič sa nekompiluje.

## Ako je zapojená doména (TOTO SI ZAPAMÄTAJ)

Doména drží na **dvoch veciach naraz** — musia platiť obe:

1. **DNS u registrátora** (nastavené, nemeň to):
   - `lumaweb.sk` → A záznamy: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www.lumaweb.sk` → CNAME: `neear0.github.io`

2. **Súbor `CNAME` v koreni repa** s obsahom `lumaweb.sk` **A ZÁROVEŇ** to isté nastavené
   v **Settings → Pages → Custom domain** na GitHube.

### ⚠️ Najčastejší spôsob ako to rozbiť

**Zmazať súbor `CNAME`.** Vtedy GitHub okamžite odpojí doménu z Pages nastavení
a lumaweb.sk začne vracať „Site not found". A pozor:

> **Nahranie súboru `CNAME` späť to NEOPRAVÍ.**
> Doménu musíš znova ručne zadať v Settings → Pages → Custom domain.

Presne toto sa stalo 26. 7. 2026 (commity `acebb14` + `8908f2c`).

### Oprava keď je web down so „Site not found"

1. Over, že web žije na https://neear0.github.io/9911699467/ — ak áno, obsah je OK
   a problém je len v doméne.
2. Choď na https://github.com/neear0/9911699467/settings/pages
3. **Custom domain** → napíš `lumaweb.sk` → **Save**
4. Počkaj na zelenú fajku pri DNS check (do minúty)
5. Keď sa doprovizuje certifikát (5–20 min), zaškrtni **Enforce HTTPS**

## Ako deployovať zmeny

Nepoužívaj „Add files via upload" cez web GitHubu — práve tak sa stratil `en/` adresár
aj `CNAME`. Rob to cez git:

```bash
cd C:\Users\Zemak\Desktop\biznis\moje\lumaweb-main

git pull                        # vždy najprv stiahni aktuálny stav
# ... uprav súbory ...
git add -A
git status                      # POZRI SA, či nemažeš niečo omylom
git commit -m "popis zmeny"
git push
```

Pred pushom skontroluj, že `git status` **nehlási zmazaný `CNAME`** ani `en/`.

## Štruktúra

| Súbor | Čo to je |
|---|---|
| `index.html` | hlavná SK stránka |
| `en/index.html` | anglická verzia (`/en/`) |
| `coming-soon.html`, `en/coming-soon.html` | placeholder pre socky, `noindex` |
| `style.css` | všetky štýly |
| `ui.js` | interakcie |
| `hero-canvas.js` | canvas animácia v hero sekcii |
| `sitemap.xml`, `robots.txt` | SEO |
| `CNAME` | **nemazať** — drží doménu |
| `og-image.jpg` | OG náhľad (1.4 MB — pokojne skomprimovať) |

## Kontroly po deployi

```bash
curl -sI https://lumaweb.sk/ | head -1        # čakaj: HTTP/2 200
curl -sI https://lumaweb.sk/en/ | head -1     # čakaj: HTTP/2 200
```

Ak vráti 404 so stránkou „Site not found · GitHub Pages" → je to doména, viď vyššie.
