const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");

const app = express();
app.set("view engine", "ejs");

let obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup")
};

console.log("Folder index.js:", __dirname);
console.log("Folder curent (de lucru):", process.cwd());
console.log("Cale fisier:", __filename);
console.log("-----------------------------------------");

// Task: Creare foldere automate
let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"]; 
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico")); 
});

// Extragem IP-ul si il trimitem global 
app.use((req, res, next) => {
    res.locals.ip = req.ip === "::1" ? "127.0.0.1" : req.ip;
    next();
});

app.get(["/", "/index", "/home"], function(req, res) {
    res.render("pagini/index");
});

// Task + BONUS: Inițializare și Validare Erori

function initErori() {
    let caleJson = path.join(__dirname, "resurse/json/erori.json"); 
    
    // BONUS 0.025: Nu exista erori.json
    if (!fs.existsSync(caleJson)) {
        console.error("EROARE FATALĂ: Fișierul erori.json nu există la calea specificată!");
        process.exit();
    }

    let continut = fs.readFileSync(caleJson).toString("utf-8");

    // BONUS 0.2: Verificare duplicat prop in INTERIORUL obiectului
    // impart fisierul in blocuri 
    let blockRegex = /\{[^{}]*\}/g; 
    let match;
    while ((match = blockRegex.exec(continut)) !== null) {
        let block = match[0];
        let keys = block.match(/"(\w+)":/g);
        if (keys) {
            let seenKeys = new Set();
            for (let key of keys) {
                if (seenKeys.has(key)) {
                    console.warn(`ATENȚIE (Bonus): Proprietatea ${key} este duplicată în același obiect JSON!`);
                }
                seenKeys.add(key);
            }
        }
    }

    let erori = obGlobal.obErori = JSON.parse(continut);

    // BONUS 0.025: Nu există prop de baza
    if (!erori.info_erori || !erori.cale_baza || !erori.eroare_default) {
        console.error("EROARE JSON: Lipsesc proprietățile obligatorii (info_erori, cale_baza sau eroare_default).");
        process.exit();
    }

    // BONUS 0.025: Pentru eroarea default
    let err_default = erori.eroare_default;
    if (!err_default.titlu || !err_default.text || !err_default.imagine) {
        console.error("EROARE JSON: Erorii default îi lipsesc titlul, textul sau imaginea.");
        process.exit();
    }

    // BONUS 0.025: Folderul cale_baza nu exi
    let caleBazaAbsoluta = path.join(__dirname, erori.cale_baza);
    if (!fs.existsSync(caleBazaAbsoluta)) {
        console.error(`EROARE JSON: Folderul cale_baza (${erori.cale_baza}) nu există în sistem!`);
        process.exit();
    }

    // verif daca am imag și BONUS 0.05 
    err_default.imagine = path.join(erori.cale_baza, err_default.imagine);
    
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
        
        let caleImagineFizica = path.join(__dirname, eroare.imagine);
        if (!fs.existsSync(caleImagineFizica)) {
            console.warn(`ATENȚIE (Bonus): Imaginea ${eroare.imagine} nu există fizic pe disc (Adaug-o ca să nu îți scadă punctajul)!`);
        }
    }
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator == identificator);
    let errDefault = obGlobal.obErori.eroare_default;
    
    if (eroare?.status) {
        res.status(eroare.identificator);
    }

    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text
    });
}


app.get("/eroare", function(req, res) {
    afisareEroare(res, 404, "Titlu!!!");
});

// CORECTARE CRITICĂ EXPRESS 5: Am schimbat din "*"
app.get("/{*pagina}", function(req, res) {
    // Blocare acces directoare din resurse
    if (req.path.startsWith("/resurse") && path.extname(req.path) == "") {
        afisareEroare(res, 403); 
        return;
    }

    // Blocare acces direct fișiere .ejs
    if (path.extname(req.path) == ".ejs") {
        afisareEroare(res, 400); 
        return;
    }

    try {
        // req.path conține calea
        res.render("pagini" + req.path, function(err, rezRandare) {
            if (err) {
                if (err.message.includes("Failed to lookup view")) {
                    afisareEroare(res, 404);
                } else {
                    afisareEroare(res, 500, "Eroare Server", "Eroare internă de randare.");
                }
            } else {
                res.send(rezRandare);
            }
        });
    } catch(err) {
        afisareEroare(res);
    }
});

app.listen(8080, () => {
    console.log("Serverul a pornit cu succes pe http://localhost:8080 !");
});