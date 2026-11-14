# LumaWeb — ako to funguje a ako deployovať

## Zostava

- **Repo:** https://github.com/neear0/9911699467 (branch `main`), obsahuje **len hotový build**
- **Zdroj:** SvelteKit projekt `C:\Users\Zemak\Desktop\biznis\moje\weby\lumaweb-svelte-v2` (adapter-static, všetko predrenderované)
- **Hosting:** GitHub Pages, servíruje priamo obsah `main`, žiadny CI
- **Doména:** lumaweb.sk (+ www)
- **Pôvodná ručne písaná HTML verzia** je v git histórii pod tagom `pre-svelte-v2` (nasadená do 14. 11. 2026)

Od 14. 11. 2026 sa **súbory v tomto repe ručne neupravujú**. Zmeny sa robia v
`lumaweb-svelte-v2`, potom build a skopírovanie sem (viď nižšie). Čokoľvek
pushneš do `main`, je za ~1 minútu online.

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

Nepoužívaj „Add files via upload“ cez web GitHubu, práve tak sa stratil `en/` adresár
aj `CNAME`. Rob to cez git:

```bash
cd C:/Users/Zemak/Desktop/biznis/moje/weby/lumaweb-svelte-v2
npm run check && npm run build      # 0 chýb, build/ hotový
npm run serve                       # náhľad ako na GitHub Pages: http://localhost:8100

cd ../lumaweb-main
git pull
git ls-files | grep -vxE "CNAME|DEPLOY.md" | xargs rm -f   # starý build preč
cp -r ../lumaweb-svelte-v2/build/. .                        # nový build dnu (vrátane .nojekyll a CNAME)
git add -A
git status                          # POZRI SA, či nemažeš CNAME ani .nojekyll
git commit -m "popis zmeny"
git push
```

`.nojekyll` musí ostať: bez neho GitHub Pages zahodí priečinok `_app/` (Jekyll ignoruje
cesty začínajúce podčiarkovníkom) a web ostane bez JS. `CNAME` a `.nojekyll` sú v
`static/` zdrojového projektu, takže ich build vždy obsahuje.

Štruktúra stránok, komponenty a poznámky k dizajnu sú v README zdrojového projektu.
Navigácia a pätička sú v jednom komponente, už sa needitujú v každom súbore zvlášť.

## Kontroly po deployi

```bash
for u in / /tvorba-webov/ /sluzby/ /proces/ /o-nas/ /faq/ /kontakt/ \
         /ochrana-osobnych-udajov/ /obchodne-podmienky/ /referencie/ \
         /en/ /en/web-development/ /en/services/ /en/process/ /en/about/ \
         /en/faq/ /en/contact/ /en/privacy/ /en/terms/ /en/work/; do
  printf '%s  ' "$u"; curl -o /dev/null -s -w '%{http_code}\n' "https://lumaweb.sk$u"
done
```

Všetkých 20 musí vrátiť 200. Ak vráti 404 so stránkou „Site not found ·
GitHub Pages" → je to doména, viď vyššie.

Po nasadení **znovu odošli sitemap v Search Console** — pribudli nové URL
a staré kotvy (`/#cennik` atď.) už neexistujú.
