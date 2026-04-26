const express = require('express');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const sharp = require('sharp');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/resurse', express.static(path.join(__dirname, 'resurse')));
app.use("/dist", express.static(path.join(__dirname, "/node_modules/bootstrap/dist")));

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate", path.join("backup", "resurse", "css")];
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}

global.folderScss = path.join(__dirname, 'resurse', 'scss');
global.folderCss = path.join(__dirname, 'resurse', 'css');
const folderBackupCss = path.join(__dirname, 'backup', 'resurse', 'css');

function compileazaScss(caleScss, caleCss) {
    if (!path.isAbsolute(caleScss)) caleScss = path.join(global.folderScss, caleScss);
    
    let numeFisierCss;
    if (!caleCss) {
        let baza = path.basename(caleScss, '.scss');
        numeFisierCss = baza + '.css';
        caleCss = path.join(global.folderCss, numeFisierCss);
    } else {
        if (!path.isAbsolute(caleCss)) caleCss = path.join(global.folderCss, caleCss);
        numeFisierCss = path.basename(caleCss);
    }

    try {
        if (fs.existsSync(caleCss)) {
            let timp = new Date().getTime();
            let numeBackup = numeFisierCss.replace('.css', `_${timp}.css`);
            let caleBackup = path.join(folderBackupCss, numeBackup);
            fs.copyFileSync(caleCss, caleBackup);
        }
        let rezultat = sass.compile(caleScss);
        fs.writeFileSync(caleCss, rezultat.css);
    } catch (err) {
        console.error(`Eroare SCSS la ${caleScss}:`, err.message);
    }
}

if (fs.existsSync(global.folderScss)) {
    let fisiere = fs.readdirSync(global.folderScss);
    for (let f of fisiere) {
        if (f.endsWith('.scss')) compileazaScss(f);
    }
    fs.watch(global.folderScss, (eventType, filename) => {
        if (filename && filename.endsWith('.scss')) compileazaScss(filename);
    });
}

let dateGalerie = null;
const caleJsonGalerie = path.join(__dirname, 'resurse', 'json', 'galerie.json');

function initImagini() {
    if (fs.existsSync(caleJsonGalerie)) {
        try {
            dateGalerie = JSON.parse(fs.readFileSync(caleJsonGalerie, 'utf8'));
            let caleAbsolutaGalerie = path.join(__dirname, dateGalerie.cale_galerie);

            if (fs.existsSync(caleAbsolutaGalerie)) {
                let caleMic = path.join(caleAbsolutaGalerie, 'mic');
                let caleMediu = path.join(caleAbsolutaGalerie, 'mediu');
                if (!fs.existsSync(caleMic)) fs.mkdirSync(caleMic);
                if (!fs.existsSync(caleMediu)) fs.mkdirSync(caleMediu);

                for (let img of dateGalerie.imagini) {
                    let caleImagine = path.join(caleAbsolutaGalerie, img.fisier_imagine);
                    if (fs.existsSync(caleImagine)) {
                        let caleImagineMica = path.join(caleMic, img.fisier_imagine);
                        let caleImagineMedie = path.join(caleMediu, img.fisier_imagine);
                        if (!fs.existsSync(caleImagineMedie)) sharp(caleImagine).resize(400).toFile(caleImagineMedie);
                        if (!fs.existsSync(caleImagineMica)) sharp(caleImagine).resize(200).toFile(caleImagineMica);
                    }
                    img.fisier = path.join('/', dateGalerie.cale_galerie, img.fisier_imagine);
                }
            }
        } catch (e) { console.error("Eroare JSON galerie:", e); }
    }
}
initImagini();

let obGlobal = { obErori: null };
function initErori() {
    let caleJson = path.join(__dirname, 'erori.json');
    if (!fs.existsSync(caleJson)) { process.exit(); }
    let erori = JSON.parse(fs.readFileSync(caleJson, 'utf-8'));
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join('/', erori.cale_baza, eroare.imagine);
    }
    erori.eroare_default.imagine = path.join('/', erori.cale_baza, erori.eroare_default.imagine);
    obGlobal.obErori = erori;
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(e => e.identificator === identificator) || obGlobal.obErori.eroare_default;
    res.status(identificator || 500).render('pagini/eroare', {
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || eroare.imagine
    });
}

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico'));
});

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});

app.get("/produse", function(req, res) {
    if (!dateGalerie) return afisareEroare(res, 500);

    let toateImaginile = dateGalerie.imagini;
    let imaginiPare = toateImaginile.filter((img, idx) => idx % 2 === 0);
    let puteri = [2, 4, 8, 16];
    let nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
    let imaginiAnimatie = imaginiPare.slice(0, nrAleator);

    let acum = new Date();
    let oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');

    let imaginiStatice = toateImaginile.filter(img => {
        if (img && typeof img.timp === "string") {
            let parti = img.timp.split("-");
            if (parti.length === 2) {
                return oraCurenta >= parti[0] && oraCurenta <= parti[1];
            }
        }
        return false;
    }).slice(0, 10);

    res.render("pagini/produse", {
        produse: toateImaginile,
        imaginiStatice: imaginiStatice,
        imaginiAnimatie: imaginiAnimatie,
        cale_galerie: dateGalerie.cale_galerie,
        optiuni: [{ unnest: "Rap" }, { unnest: "Rock" }, { unnest: "Pop" }, { unnest: "Jazz" }, { unnest: "Electronic" }, { unnest: "Reggae" }]
    });
});

app.get('/produs/:id', (req, res) => {
    let idCautat = parseInt(req.params.id);
    let produs = dateGalerie.imagini.find(p => p.id === idCautat);
    if (produs) res.render('pagini/produs', { prod: produs });
    else afisareEroare(res, 404);
});

app.get('^/*.ejs$', (req, res) => afisareEroare(res, 400));
app.get('/resurse/*', (req, res, next) => {
    let caleFisier = path.join(__dirname, req.path);
    if (fs.existsSync(caleFisier) && fs.statSync(caleFisier).isDirectory()) afisareEroare(res, 403);
    else next();
});

app.get('/*', (req, res) => {
    let pagina = req.params[0];
    res.render('pagini/' + pagina, { ip: req.ip }, function(err, html) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res);
        } else res.send(html);
    });
});

app.listen(8080, () => {
    console.log("Serverul a pornit la http://localhost:8080");
});