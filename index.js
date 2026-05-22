const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");
const pg = require("pg");

const app = express();

app.set("view engine", "ejs");


//================================================
// CONECTARE POSTGRES
//================================================

const Client = pg.Client;

const client = new Client({
    database: "magazincd",
    user: "andaelena1",
    password: "parola123",
    host: "localhost",
    port: 5432
});

client.connect(function(err){
    if(err){
        console.log("Eroare conectare PostgreSQL");
        console.log(err);
    }
    else{
        console.log("Conectat PostgreSQL");
    }
});


//================================================
// OBIECT GLOBAL
//================================================

obGlobal = {
    obErori: null,
    obImagini: null,

    folderScss: path.join(__dirname, "resurse/scss"),

    folderCss: path.join(__dirname, "resurse/css"),

    folderBackup: path.join(__dirname, "backup")
};


//================================================
// INFO SERVER
//================================================

console.log("Folder index.js:", __dirname);
console.log("Folder curent:", process.cwd());
console.log("Cale fisier:", __filename);


//================================================
// CREARE FOLDERE
//================================================

let vect_foldere = [
    "temp",
    "logs",
    "backup",
    "fisiere_uploadate"
];

for(let folder of vect_foldere){

    let caleFolder = path.join(__dirname, folder);

    if(!fs.existsSync(caleFolder)){

        fs.mkdirSync(caleFolder, {
            recursive: true
        });
    }
}


//================================================
// INIT ERORI
//================================================

function initErori(){

    let continut = fs.readFileSync(
        path.join(__dirname, "resurse/json/erori.json")
    ).toString("utf-8");

    let erori = JSON.parse(continut);

    obGlobal.obErori = erori;

    let err_default = erori.eroare_default;

    err_default.imagine = path.join(
        erori.cale_baza,
        err_default.imagine
    );

    for(let eroare of erori.info_erori){

        eroare.imagine = path.join(
            erori.cale_baza,
            eroare.imagine
        );
    }
}

initErori();


//================================================
// INIT IMAGINI
//================================================

function initImagini(){

    let continut = fs.readFileSync(
        path.join(__dirname, "resurse/json/galerie.json")
    ).toString("utf-8");

    obGlobal.obImagini = JSON.parse(continut);

    let vImagini = obGlobal.obImagini.imagini;

    let caleGalerie = obGlobal.obImagini.cale_galerie;

    let caleAbs = path.join(__dirname, caleGalerie);

    let caleAbsMediu = path.join(caleAbs, "mediu");

    if(!fs.existsSync(caleAbsMediu)){
        fs.mkdirSync(caleAbsMediu);
    }

    for(let imag of vImagini){

        let parti = imag.fisier_imagine.split(".");

        let ext = parti.pop();

        let numeFis = parti.join(".");

        let caleFisAbs = path.join(
            caleAbs,
            imag.fisier_imagine
        );

        let caleFisMediuAbs = path.join(
            caleAbsMediu,
            numeFis + ".webp"
        );

        if(fs.existsSync(caleFisAbs)){

            sharp(caleFisAbs)
                .resize(300)
                .toFile(caleFisMediuAbs)
                .catch(err => {});
        }

        imag.fisier_mediu =
            "/" + caleGalerie + "/mediu/" + numeFis + ".webp";

        imag.fisier =
            "/" + caleGalerie + "/" + imag.fisier_imagine;
    }
}

initImagini();


//================================================
// FISIERE STATICE
//================================================

app.use(
    "/resurse",
    express.static(path.join(__dirname, "resurse"))
);

app.use(
    "/dist",
    express.static(
        path.join(__dirname, "node_modules/bootstrap/dist")
    )
);


//================================================
// FAVICON
//================================================

app.get("/favicon.ico", function(req, res){

    res.sendFile(
        path.join(
            __dirname,
            "resurse/imagini/favicon/favicon.ico"
        )
    );
});


//================================================
// PAGINA PRINCIPALA
//================================================

app.get(
    ["/", "/index", "/home"],
    function(req, res){

        res.render("pagini/index", {

            ip: req.ip,

            imagini:
                obGlobal.obImagini
                ? obGlobal.obImagini.imagini
                : []
        });
    }
);


//================================================
// GALERIE
//================================================

app.get("/galerie", function(req, res){

    if(!obGlobal.obImagini){

        return res.send("Imaginile nu sunt incarcate.");
    }

    let imaginiPare =
        obGlobal.obImagini.imagini.filter(
            (img, idx) => idx % 2 === 0
        );

    let puteri = [2, 4, 8, 16];

    let nrAleator =
        puteri[Math.floor(Math.random() * puteri.length)];

    let imaginiSelectate =
        imaginiPare.slice(0, nrAleator);

    let caleScssAnimata = path.join(
        obGlobal.folderScss,
        "galerie.scss"
    );

    if(fs.existsSync(caleScssAnimata)){

        let continutScss =
            fs.readFileSync(
                caleScssAnimata,
                "utf8"
            );

        let scssCuVariabile =
            `$nrimag:${nrAleator};\n`
            + continutScss;

        try{

            let rez = sass.compileString(
                scssCuVariabile,
                {
                    loadPaths: [obGlobal.folderScss]
                }
            );

            fs.writeFileSync(
                path.join(
                    obGlobal.folderCss,
                    "galerie.css"
                ),
                rez.css
            );

        }catch(err){

            console.log(err);
        }
    }

    let acum = new Date();

    let oraCurenta =
        acum.getHours().toString().padStart(2, '0')
        + ":"
        + acum.getMinutes().toString().padStart(2, '0');

    let imaginiFiltrateTimp =
        obGlobal.obImagini.imagini.filter(img => {

            let [oraStart, oraSfarsit] =
                img.timp.split("-");

            return (
                oraCurenta >= oraStart
                &&
                oraCurenta <= oraSfarsit
            );

        }).slice(0, 10);

    res.render("pagini/galerie", {

        ip: req.ip,

        imagini: imaginiFiltrateTimp,

        imaginiAnimatie: imaginiSelectate,

        cale_galerie:
            obGlobal.obImagini.cale_galerie
    });
});


//================================================
// PRODUSE DIN BAZA DE DATE
//================================================

app.get("/produse", function(req, res){

    client.query(
        "select * from produse",
        function(err, rezultat){

            if(err){

                console.log(err);

                afisareEroare(
                    res,
                    2,
                    "Eroare baza de date",
                    "Nu se pot incarca produsele."
                );

                return;
            }

            res.render(
                "pagini/produse",
                {
                    produse: rezultat.rows
                }
            );
        }
    );
});


//================================================
// AFISARE EROARE
//================================================

function afisareEroare(
    res,
    identificator,
    titlu,
    text,
    imagine
){

    let eroare =
        obGlobal.obErori?.info_erori.find(
            elem => elem.identificator == identificator
        );

    let errDefault =
        obGlobal.obErori?.eroare_default;

    res.status(identificator || 404);

    res.render("pagini/eroare", {

        imagine:
            imagine
            || eroare?.imagine
            || errDefault?.imagine
            || "",

        titlu:
            titlu
            || eroare?.titlu
            || errDefault?.titlu
            || "Eroare",

        text:
            text
            || eroare?.text
            || errDefault?.text
            || "A aparut o problema."
    });
}


//================================================
// COMPILARE SCSS
//================================================

function compileazaScss(
    caleScss,
    caleCss
){

    let numeFisExt =
        path.basename(caleScss);

    let numeFis =
        numeFisExt.replace(/\.scss$/, '');

    if(!caleCss){

        caleCss = numeFis + ".css";
    }

    if(!path.isAbsolute(caleScss)){

        caleScss = path.join(
            obGlobal.folderScss,
            caleScss
        );
    }

    if(!path.isAbsolute(caleCss)){

        caleCss = path.join(
            obGlobal.folderCss,
            caleCss
        );
    }

    let caleBackup = path.join(
        obGlobal.folderBackup,
        "resurse/css"
    );

    if(!fs.existsSync(caleBackup)){

        fs.mkdirSync(caleBackup, {
            recursive: true
        });
    }

    let numeFisCss =
        path.basename(caleCss);

    if(fs.existsSync(caleCss)){

        let timestamp = Date.now();

        fs.copyFileSync(
            caleCss,
            path.join(
                caleBackup,
                timestamp + "_" + numeFisCss
            )
        );
    }

    try{

        let rez = sass.compile(
            caleScss,
            {
                sourceMap: true
            }
        );

        fs.writeFileSync(
            caleCss,
            rez.css
        );

    }catch(err){

        console.log(err.message);
    }
}


//================================================
// WATCH SCSS
//================================================

if(fs.existsSync(obGlobal.folderScss)){

    let vFisiere =
        fs.readdirSync(obGlobal.folderScss);

    for(let numeFis of vFisiere){

        if(path.extname(numeFis) == ".scss"){

            compileazaScss(numeFis);
        }
    }

    fs.watch(
        obGlobal.folderScss,
        function(eveniment, numeFis){

            if(
                (
                    eveniment == "change"
                    ||
                    eveniment == "rename"
                )
                &&
                numeFis.endsWith(".scss")
            ){

                let caleCompleta = path.join(
                    obGlobal.folderScss,
                    numeFis
                );

                if(fs.existsSync(caleCompleta)){

                    compileazaScss(caleCompleta);
                }
            }
        }
    );
}


//================================================
// RUTE GENERALE
//================================================

app.get(/^\/(.*)/, function(req, res){

    let cerereCale = req.params[0];

    if(!cerereCale || cerereCale === "/"){
        return;
    }

    if(
        req.path.startsWith("/resurse")
        &&
        path.extname(req.path) == ""
    ){
        afisareEroare(res, 403);
        return;
    }

    if(path.extname(req.path) == ".ejs"){

        afisareEroare(res, 400);
        return;
    }

    try{

        res.render(
            "pagini/" + cerereCale,
            {
                ip: req.ip
            },

            function(err, rezRandare){

                if(err){

                    if(
                        err.message.includes(
                            "Failed to lookup view"
                        )
                    ){

                        afisareEroare(res, 404);
                    }
                    else{

                        afisareEroare(
                            res,
                            500,
                            "Eroare randare",
                            "A aparut o problema."
                        );
                    }
                }
                else{

                    res.send(rezRandare);
                }
            }
        );

    }catch(err){

        afisareEroare(res, 404);
    }
});


//================================================
// SERVER
//================================================

app.listen(8080, function(){

    console.log(
        "Server pornit pe http://localhost:8080"
    );
});