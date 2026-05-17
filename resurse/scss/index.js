const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");

const app = express();
app.set("view engine", "ejs");


console.log("--- Verificare Căi ---");
console.log("Calea folderului curent al scriptului (__dirname):", __dirname);
console.log("Calea fișierului curent (__filename):", __filename);
console.log("Folderul curent de lucru (process.cwd()):", process.cwd());
console.log("Întrebare: Sunt __dirname și process.cwd() la fel mereu? Răspuns: NU. __dirname depinde de unde e fișierul, process.cwd() depinde de unde rulezi comanda în terminal.");
console.log("----------------------");

global.obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/CSS"),
    folderBackup: path.join(__dirname, "backup"),
};


let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/dist", express.static(path.join(__dirname, "/node_modules/bootstrap/dist")));

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/imagini/ico/favicon.ico"));
});

app.get(["/", "/index", "/home"], function(req, res) {
    res.render("pagini/index", {
        ip: req.ip,
        imagini: obGlobal.obImagini ? obGlobal.obImagini.imagini : []
    });
});

// BONUS: verificare JSON erori

function verificaErori() {
    let caleJson = path.join(__dirname, "resurse/json/erori.json");

    // Bonus 0.025: Nu am erori.json -> stop aplicatie
    if (!fs.existsSync(caleJson)) {
        console.error("CRITICAL ERROR: Fișierul erori.json nu există! Aplicația se oprește.");
        process.exit(1);
    }

    let continutString = fs.readFileSync(caleJson, "utf-8");

    // Bonus 0.2: verificare prop duplicate 

    let fragmenteObiecte = continutString.split("}");
    for (let fragment of fragmenteObiecte) {
        let chei = ["titlu", "text", "imagine", "identificator", "status"];
        for (let cheie of chei) {
            let matches = fragment.match(new RegExp(`"${cheie}"\\s*:`, "g"));
            if (matches && matches.length > 1) {
                console.error(`Eroare JSON: Proprietatea "${cheie}" apare de mai multe ori într-un obiect!`);
            }
        }
    }

    let eroriObj;
    try {
        eroriObj = JSON.parse(continutString);
    } catch (e) {
        console.error("Eroare JSON: Fișierul nu este valid din punct de vedere sintactic.");
        return;
    }

    // Bonus 0.025: lipsa prop de baza
    if (!eroriObj.info_erori || !eroriObj.cale_baza || !eroriObj.eroare_default) {
        console.error("Eroare structură JSON: Lipsesc proprietățile info_erori, cale_baza sau eroare_default.");
    }

    // Bonus 0.025: lipsa prop în eroare_default
    let ed = eroriObj.eroare_default;
    if (ed && (!ed.titlu || !ed.text || !ed.imagine)) {
        console.error("Eroare default JSON: Lipsesc proprietăți obligatorii (titlu, text sau imagine).");
    }

    // Bonus 0.025: fold din cale_baza nu e în sistem
    // Eliminăm primul slash dacă e rută absolută web pentru a o verifica pe disk
    let caleBazaAbs = path.join(__dirname, eroriObj.cale_baza);
    if (!fs.existsSync(caleBazaAbs)) {
        console.error(`Eroare sistem: Folderul specificat în cale_baza (${caleBazaAbs}) nu există pe disc.`);
    }

    // Bonus 0.05: verif daca exi imagini specifice pe disc
    if (eroriObj.info_erori && fs.existsSync(caleBazaAbs)) {
        for (let err of eroriObj.info_erori) {
            let caleImg = path.join(caleBazaAbs, err.imagine);
            if (!fs.existsSync(caleImg)) {
                console.error(`Eroare imagine: Imaginea "${err.imagine}" pentru eroarea ${err.identificator} nu există la calea ${caleImg}.`);
            }
        }
    }

    // Bonus 0.15: Identificatori duplicati in info_erori
    if (eroriObj.info_erori) {
        let idSăvârșite = [];
        for (let i = 0; i < eroriObj.info_erori.length; i++) {
            let curent = eroriObj.info_erori[i];
            if (idSăvârșite.includes(curent.identificator)) {
                console.error(`Eroare duplicat: Există mai multe erori cu identificatorul ${curent.identificator}! Detalii duplicat găsit: Titlu: ${curent.titlu}, Text: ${curent.text}, Imagine: ${curent.imagine}`);
            } else {
                idSăvârșite.push(curent.identificator);
            }
        }
    }
}

// apelez verif
verificaErori();

// Initializare Erori în Memorie
function initErori() {
    let caleJson = path.join(__dirname, "resurse/json/erori.json");
    let continut = fs.readFileSync(caleJson).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut);
    
    // ATENȚIE: Nu folosim path.join hardcoded pentru HTML. Lăsăm căi de tip URL relative la server.
    let de_la_baza = erori.cale_baza; // e deja "/resurse/imagini/erori"
    
    erori.eroare_default.imagine = de_la_baza + "/" + erori.eroare_default.imagine;
    for (let eroare of erori.info_erori) {
        eroare.imagine = de_la_baza + "/" + eroare.imagine;
    }
}
initErori();

// Funcția de afișare erori conform cerințelor
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator == identificator);
    let errDefault = obGlobal.obErori.eroare_default;
    
    // Stabilim codul de status alocat
    let statusHttp = identificator || 500;
    if (eroare && eroare.status === false) {
        statusHttp = 200; // Dacă în JSON scrie status: false, forțăm 200 conform instrucțiunilor tale din text
    }
    res.status(statusHttp);
    
    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text
    });
}

// Restul rutelelor tale (Galerie, Produse, Produs individual)
app.get("/galerie", function(req, res) {
    if (!obGlobal.obImagini) return res.send("Imaginile nu sunt incarcate.");
    let imaginiPare = obGlobal.obImagini.imagini.filter((img, idx) => idx % 2 === 0);
    let puteri = [2, 4, 8, 16];
    let nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
    let imaginiSelectate = imaginiPare.slice(0, nrAleator);

    let caleScssAnimata = path.join(obGlobal.folderScss, "galerie_animata.scss");
    if (fs.existsSync(caleScssAnimata)) {
        let continutScss = fs.readFileSync(caleScssAnimata, "utf8");
        let scssCuVariabile = `$nrimag: ${nrAleator};\n` + continutScss;
        try {
            let rez = sass.compileString(scssCuVariabile, { loadPaths: [obGlobal.folderScss] });
            fs.writeFileSync(path.join(obGlobal.folderCss, "galerie_animata.css"), rez.css);
        } catch (err) {
            console.error("Eroare compilare dinamica:", err);
        }
    }

    let acum = new Date();
    let oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');
    let imaginiFiltrateTimp = obGlobal.obImagini.imagini.filter(img => {
        let [oraStart, oraSfarsit] = img.timp.split("-");
        return oraCurenta >= oraStart && oraCurenta <= oraSfarsit;
    }).slice(0, 10);
    
    res.render("pagini/galerie", {
        imagini: imaginiFiltrateTimp,
        imaginiAnimatie: imaginiSelectate,
        cale_galerie: obGlobal.obImagini.cale_galerie
    });
});

app.get("/produse", function(req, res) {
    if (!obGlobal.obImagini) return res.send("Imaginile nu sunt incarcate.");
    let toateImaginile = obGlobal.obImagini.imagini;
    let imaginiPare = toateImaginile.filter((img, idx) => idx % 2 === 0);
    let puteri = [2, 4, 8, 16];
    let nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
    let imaginiAnimatie = imaginiPare.slice(0, nrAleator);

    let acum = new Date();
    let oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');

    let imaginiStatice = toateImaginile.filter(img => {
        if (!img || typeof img.timp !== "string") return false;
        let partiTimp = img.timp.split("-");
        if (partiTimp.length !== 2) return false;
        let [oraStart, oraSfarsit] = partiTimp;
        return oraCurenta >= oraStart && oraCurenta <= oraSfarsit;
    }).slice(0, 10);

    res.render("pagini/produse", {
        produse: toateImaginile,
        imaginiStatice: imaginiStatice,
        imaginiAnimatie: imaginiAnimatie,
        cale_galerie: obGlobal.obImagini.cale_galerie,
        optiuni: [{ unnest: "Rap" }, { unnest: "Rock" }, { unnest: "Pop" }, { unnest: "Jazz" }, { unnest: "Electronic" }, { unnest: "Reggae" }]
    });
});

app.get("/produs/:id", function(req, res) {
    let idCautat = parseInt(req.params.id);
    let produsGasit = obGlobal.obImagini.imagini.find(p => p.id === idCautat);
    if (produsGasit) {
        res.render("pagini/produs", { prod: produsGasit });
    } else {
        afisareEroare(res, 404);
    }
});

function initImagini() {
    let caleGalerieJson = path.join(__dirname, "resurse/json/galerie.json");
    if(!fs.existsSync(caleGalerieJson)) return;
    var continut = fs.readFileSync(caleGalerieJson).toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);
    let vImagini = obGlobal.obImagini.imagini;
    let caleGalerie = obGlobal.obImagini.cale_galerie;

    let caleAbs = path.join(__dirname, caleGalerie);
    let caleAbsMediu = path.join(caleAbs, "mediu");
    if (!fs.existsSync(caleAbsMediu)) fs.mkdirSync(caleAbsMediu, { recursive: true });
    
    for (let imag of vImagini) {
        let [numeFis, ext] = imag.fisier_imagine.split("."); 
        let caleFisAbs = path.join(caleAbs, imag.fisier_imagine);
        let caleFisMediuAbs = path.join(caleAbsMediu, numeFis + ".webp");
        if (fs.existsSync(caleFisAbs)) {
            sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs).catch(err => {});
        }
        imag.fisier_mediu = "/" + caleGalerie + "/mediu/" + numeFis + ".webp";
        imag.fisier = "/" + caleGalerie + "/" + imag.fisier_imagine;
    }
}
initImagini();

function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisExt = path.basename(caleScss); 
        let numeFis = numeFisExt.split(".")[0];   
        caleCss = numeFis + ".css"; 
    }
    if (!path.isAbsolute(caleScss)) caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss)) caleCss = path.join(obGlobal.folderCss, caleCss);
    
    let caleBackup = path.join(obGlobal.folderBackup, "resurse/CSS");
    if (!fs.existsSync(caleBackup)) fs.mkdirSync(caleBackup, { recursive: true });
    
    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        let timestamp = Date.now();
        fs.copyFileSync(caleCss, path.join(caleBackup, timestamp + "_" + numeFisCss));
    }
    try {
        let rez = sass.compile(caleScss, { "sourceMap": true });
        fs.writeFileSync(caleCss, rez.css);
    } catch (err) { console.error("Eroare SASS:", err.message); }
}

if (fs.existsSync(obGlobal.folderScss)) {
    let vFisiere = fs.readdirSync(obGlobal.folderScss);
    for (let numeFis of vFisiere) {
        if (path.extname(numeFis) == ".scss") compileazaScss(numeFis);
    }
    fs.watch(obGlobal.folderScss, function(eveniment, numeFis) {
        if (eveniment == "change" || eveniment == "rename") {
            let caleCompleta = path.join(obGlobal.folderScss, numeFis);
            if (fs.existsSync(caleCompleta)) compileazaScss(caleCompleta);
        }
    });
}


app.get("/*", function(req, res) {
    let cerereCale = req.params[0]; // preia stringul de dupa slash

    if (req.path.startsWith("/resurse") && path.extname(req.path) == "") {
        afisareEroare(res, 403); 
        return;
    }
    if (path.extname(req.path) == ".ejs") {
        afisareEroare(res, 400); 
        return;
    }

    res.render("pagini/" + cerereCale, { ip: req.ip }, function(err, rezRandare) {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Server", "A apărut o problemă la randare.");
            }
        } else {
            res.send(rezRandare);
        }
    });
});

app.listen(8080, () => {
    console.log("Serverul a pornit la adresa: http://localhost:8080");
});