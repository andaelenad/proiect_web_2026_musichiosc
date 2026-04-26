const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");

app = express();
app.set("view engine", "ejs")

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname,"resurse/scss"),
    folderCss: path.join(__dirname,"resurse/CSS"),
    folderBackup: path.join(__dirname,"backup"),
}

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere){
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, {recursive:true});   
    }
}

app.use("/Resurse", express.static(path.join(__dirname, "resurse")));
app.use("/dist", express.static(path.join(__dirname, "/node_modules/bootstrap/dist")));

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname,"resurse/imagini/ico/favicon.ico"));
});

app.get(["/", "/index", "/home"], function(req, res){
    res.render("pagini/index",{
        ip: req.ip,
        imagini: obGlobal.obImagini.imagini
    });
});

app.get("/galerie", function(req, res) {
    let imaginiPare = obGlobal.obImagini.imagini.filter((img, idx) => idx % 2 === 0);
    let puteri = [2, 4, 8, 16];
    let nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
    let imaginiSelectate = imaginiPare.slice(0, nrAleator);

    // --- LOGICA PENTRU GENERARE SASS DINAMIC ---
    let caleScssAnimata = path.join(obGlobal.folderScss, "galerie_animata.scss");
    let continutScss = fs.readFileSync(caleScssAnimata, "utf8");
    // Inlocuim sau adaugam variabila la inceputul fisierului
    let scssCuVariabile = `$nrimag: ${nrAleator};\n` + continutScss;
    
    // Compilam SASS-ul direct din string
    try {
        let rez = sass.compileString(scssCuVariabile, {
            loadPaths: [obGlobal.folderScss]
        });
        fs.writeFileSync(path.join(obGlobal.folderCss, "galerie_animata.css"), rez.css);
    } catch (err) {
        console.error("Eroare compilare dinamica:", err);
    }
    // -------------------------------------------

    let acum = new Date();
    let oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');

    let imaginiFiltrateTimp = obGlobal.obImagini.imagini.filter(img => {
        let [oraStart, oraSfarsit] = img.timp.split("-");
        return oraCurenta >= oraStart && oraCurenta <= oraSfarsit;
    }).slice(0, 10);
    
    res.render("pagini/galerie", { // Asigura-te ca numele paginii e corect
        imagini: imaginiFiltrateTimp,
        imaginiAnimatie: imaginiSelectate,
        cale_galerie: obGlobal.obImagini.cale_galerie
    });
});

app.get("/produse", function(req, res){
    let toateImaginile = obGlobal.obImagini.imagini;

    let imaginiPare = toateImaginile.filter((img, idx) => idx % 2 === 0);
    let puteri = [2, 4, 8, 16];
    let nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
    let imaginiAnimatie = imaginiPare.slice(0, nrAleator);

    let acum = new Date();
    let oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');

let imaginiStatice = toateImaginile.filter(img => {
    
    if (!img || typeof img.timp !== "string") {
        console.warn(`Imaginea cu ID ${img?.id || 'necunoscut'} nu are câmpul 'timp' valid.`);
        return false; 
    }

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

function initErori(){
    let continut = fs.readFileSync(path.join(__dirname,"resurse/json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut);
    let err_default = erori.eroare_default;
    err_default.imagine = path.join(erori.cale_baza, err_default.imagine);
    for (let eroare of erori.info_erori){
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine){
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator == identificator);
    let errDefault = obGlobal.obErori.eroare_default;
    res.status(identificator || 404);
    res.render("pagini/eroare",{
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text
    });
}

function initImagini(){
    var continut = fs.readFileSync(path.join(__dirname,"Resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);
    let vImagini = obGlobal.obImagini.imagini;
    let caleGalerie = obGlobal.obImagini.cale_galerie;

    let caleAbs = path.join(__dirname, caleGalerie);
    if (!fs.existsSync(caleAbs)) {
        console.error(`EROARE: Folderul galeriei ${caleAbs} nu exista!`);
    }

    let caleAbsMediu = path.join(caleAbs, "mediu");
    if (!fs.existsSync(caleAbsMediu)) fs.mkdirSync(caleAbsMediu, {recursive: true});
    
    for (let imag of vImagini){
        let [numeFis, ext] = imag.fisier_imagine.split("."); 
        let caleFisAbs = path.join(caleAbs, imag.fisier_imagine);
        if (!fs.existsSync(caleFisAbs)) {
            console.error(`EROARE: Imaginea ${imag.fisier_imagine} lipseste de pe disc!`);
        }
        let caleFisMediuAbs = path.join(caleAbsMediu, numeFis+".webp");
        if(fs.existsSync(caleFisAbs)) {
            sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs).catch(err => {});
        }
        imag.fisier_mediu = path.join("/", caleGalerie, "mediu", numeFis+".webp" );
        imag.fisier = path.join("/", caleGalerie, imag.fisier_imagine );
    }
}
initImagini();

function compileazaScss(caleScss, caleCss){
    if(!caleCss){
        let numeFisExt = path.basename(caleScss); 
        let numeFis = numeFisExt.split(".")[0];   
        caleCss = numeFis+".css"; 
    }
    if (!path.isAbsolute(caleScss)) caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss)) caleCss = path.join(obGlobal.folderCss, caleCss);
    
    let caleBackup = path.join(obGlobal.folderBackup, "Resurse/CSS");
    if (!fs.existsSync(caleBackup)) fs.mkdirSync(caleBackup,{recursive:true});
    
    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)){
        let timestamp = Date.now();
        fs.copyFileSync(caleCss, path.join(caleBackup, timestamp + "_" + numeFisCss));
    }
    try {
        let rez = sass.compile(caleScss, {"sourceMap":true});
        fs.writeFileSync(caleCss, rez.css);
    } catch(err) { console.error("Eroare SASS:", err.message); }
}

if (fs.existsSync(obGlobal.folderScss)) {
    let vFisiere = fs.readdirSync(obGlobal.folderScss);
    for( let numeFis of vFisiere ){
        if (path.extname(numeFis) == ".scss") compileazaScss(numeFis);
    }
    fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
        if (eveniment == "change" || eveniment == "rename"){
            let caleCompleta = path.join(obGlobal.folderScss, numeFis);
            if (fs.existsSync(caleCompleta)) compileazaScss(caleCompleta);
        }
    });
}

app.get(/.*/, function(req, res){
    if (req.path.startsWith("/resurse") && path.extname(req.path) == ""){
        afisareEroare(res, 403); return;
    }
    if (path.extname(req.path) == ".ejs"){
        afisareEroare(res, 400); return;
    }
    try{
        res.render("pagini"+req.path, function(err, rezRandare){
            if (err){
                if (err.message.includes("Failed to lookup view")) afisareEroare(res, 404);
                else afisareEroare(res);
            } else res.send(rezRandare);
        });
    } catch(err){ afisareEroare(res, 404); }
});

app.listen(8080, () => {
    console.log("Serverul a pornit: http://localhost:8080");
});