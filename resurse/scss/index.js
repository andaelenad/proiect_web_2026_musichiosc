const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// afisare cai cerute in cerinta
console.log("calea folderului (__dirname): " + __dirname);
console.log("calea fisierului (__filename): " + __filename);
console.log("folderul curent de lucru (cwd): " + process.cwd());

// setare ejs ca motor de template-uri
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// definirea folderului static resurse
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// creare automata foldere necesare la pornire
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}

// variabila globala ceruta
let obGlobal = {
    obErori: null
};

function initErori() {
    let caleJson = path.join(__dirname, 'erori.json');
    
    // bonus 1: nu exista fisierul
    if (!fs.existsSync(caleJson)) {
        console.error("eroare critica: nu exista fisierul erori.json. serverul se va opri.");
        process.exit();
    }

    // citim fisierul ca string brut pentru bonusul cu verificarea pe string
    let dateString = fs.readFileSync(caleJson, 'utf-8');

    // bonus 6: verificare proprietate duplicata folosind string-ul
    let regexBlocuri = /\{([^{}]*)\}/g;
    let match;
    while ((match = regexBlocuri.exec(dateString)) !== null) {
        let bloc = match[1];
        let regexChei = /"([^"]+)"\s*:/g;
        let cheiGasite = [];
        let matchCheie;
        while ((matchCheie = regexChei.exec(bloc)) !== null) {
            cheiGasite.push(matchCheie[1]);
        }
        
        let cheiUnice = new Set(cheiGasite);
        if (cheiGasite.length !== cheiUnice.size) {
            console.error("eroare bonus string: ai o proprietate declarata de mai multe ori in acelasi obiect json!");
        }
    }

    // parsam json-ul
    let erori = JSON.parse(dateString);

    // bonus 2: lipsesc proprietatile principale
    if (!erori.info_erori || !erori.cale_baza || !erori.eroare_default) {
        console.error("eroare: lipseste info_erori, cale_baza sau eroare_default din json.");
        process.exit();
    }

    // bonus 3: lipsesc proprietati in eroarea default
    if (!erori.eroare_default.titlu || !erori.eroare_default.text || !erori.eroare_default.imagine) {
        console.error("eroare: eroare_default nu are toate proprietatile (titlu, text, imagine).");
        process.exit();
    }

    // bonus 4: folderul cale_baza nu exista
    let folderBaza = path.join(__dirname, erori.cale_baza);
    if (!fs.existsSync(folderBaza)) {
        console.error("eroare: folderul specificat in cale_baza (" + erori.cale_baza + ") nu exista.");
        process.exit();
    }

    // bonus 7: identificatori duplicati (am folosit id_uri cu underscore aici)
    let id_uri = erori.info_erori.map(e => e.identificator);
    let id_uriUnice = new Set(id_uri);
    if (id_uri.length !== id_uriUnice.size) {
        console.error("eroare bonus: ai pus mai multe erori cu acelasi identificator in vectorul info_erori!");
        let duplicate = id_uri.filter((item, index) => id_uri.indexOf(item) !== index);
        for(let idDuplicat of duplicate) {
            let eroriGresite = erori.info_erori.filter(e => e.identificator === idDuplicat);
            console.error(`  -> elemente cu id ${idDuplicat}:`, eroriGresite.map(e => ({ titlu: e.titlu, text: e.text })));
        }
    }

    // setam căile pentru imagini
    for (let eroare of erori.info_erori) {
        let numeImagine = eroare.imagine;
        eroare.imagine = path.join('/', erori.cale_baza, numeImagine);
        
        let caleFizicaPoza = path.join(__dirname, erori.cale_baza, numeImagine);
        if(!fs.existsSync(caleFizicaPoza)) {
            console.error(`eroare bonus: imaginea ${caleFizicaPoza} pentru eroarea ${eroare.identificator} nu exista pe disc!`);
        }
    }
    
    erori.eroare_default.imagine = path.join('/', erori.cale_baza, erori.eroare_default.imagine);
    obGlobal.obErori = erori;
}

initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
    if (!eroare) {
        eroare = obGlobal.obErori.eroare_default;
    }
    
    let titluFinal = titlu || eroare.titlu;
    let textFinal = text || eroare.text;
    let imagineFinala = imagine || eroare.imagine;

    if (eroare.status) {
        res.status(identificator ? identificator : 500);
    }

    res.render('pagini/eroare', {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinala
    });
}

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico'));
});

app.get('^/*.ejs$', (req, res) => {
    afisareEroare(res, 400);
});

app.get('/resurse/*', (req, res, next) => {
    let caleFisier = path.join(__dirname, req.path);
    if (fs.existsSync(caleFisier) && fs.statSync(caleFisier).isDirectory()) {
        afisareEroare(res, 403);
    } else {
        next(); 
    }
});

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});

app.get('/*', (req, res) => {
    let pagina = req.params[0];
    res.render('pagini/' + pagina, { ip: req.ip }, function(err, html) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res);
            }
        } else {
            res.send(html);
        }
    });
});

app.listen(8080, () => {
    console.log("serverul a pornit impecabil pe portul 8080!");
});