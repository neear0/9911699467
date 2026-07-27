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

Od 27. 7. 2026 to **nie je one-page** — každá sekcia má vlastnú URL.

| URL | Súbor | Obsah |
|---|---|---|
| `/` | `index.html` | hero + prístup + záverečná CTA |
| `/proces/` | `proces/index.html` | päť krokov |
| `/sluzby/` | `sluzby/index.html` | šesť služieb |
| `/cennik/` | `cennik/index.html` | tri balíčky |
| `/faq/` | `faq/index.html` | otázky (nesie FAQPage schema) |
| `/kontakt/` | `kontakt/index.html` | kontakt + formulár |

Anglická vetva je zrkadlom pod `/en/`: `/en/`, `/en/process/`, `/en/services/`,
`/en/pricing/`, `/en/faq/`, `/en/contact/`. Slugy sú anglické, takže hreflang
páruje 1:1.

| Ostatné | Čo to je |
|---|---|
| `coming-soon.html`, `en/coming-soon.html` | placeholder pre socky, `noindex` |
| `style.css` | všetky štýly (zdieľané všetkými stránkami) |
| `ui.js` | nav, FAQ akordeón, odoslanie formulára, rok v päte |
| `hero-canvas.js` | canvas animácia — načítava sa **len na domovských stránkach** |
| `sitemap.xml`, `robots.txt` | SEO — sitemap má 12 URL s hreflang |
| `CNAME` | **nemazať** — drží doménu |
| `og-image.jpg` | OG náhľad (1.4 MB — pokojne skomprimovať) |

### ⚠️ Navigácia a pätička sú v každom súbore zvlášť

Nie je tu žiadny build ani šablóny. Keď meníš odkaz v navigácii alebo čokoľvek
v pätičke, **musíš to spraviť v každom z 12 súborov**. Kontrola, či niečo
nezostalo pozadu:

```bash
grep -rc "nav-links" --include=index.html .    # každý musí vrátiť 1
```

### Cesty sú absolútne

Odkazy aj assety idú cez `/` (`/style.css`, `/sluzby/`). To znamená, že
**otvorenie súboru priamo z disku nebude fungovať** — nenačíta sa CSS ani
prelinkovanie. Na lokálny náhľad si spusť server:

```bash
cd C:\Users\Zemak\Desktop\biznis\moje\lumaweb-main
npx serve -l 8099          # potom http://localhost:8099
```

## Kontroly po deployi

```bash
for u in / /proces/ /sluzby/ /cennik/ /faq/ /kontakt/ \
         /en/ /en/process/ /en/services/ /en/pricing/ /en/faq/ /en/contact/; do
  printf '%s  ' "$u"; curl -o /dev/null -s -w '%{http_code}\n' "https://lumaweb.sk$u"
done
```

Všetkých 12 musí vrátiť 200. Ak vráti 404 so stránkou „Site not found ·
GitHub Pages" → je to doména, viď vyššie.

Po nasadení **znovu odošli sitemap v Search Console** — pribudlo 10 nových URL
a staré kotvy (`/#cennik` atď.) už neexistujú.
