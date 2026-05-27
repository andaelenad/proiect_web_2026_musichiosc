const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");
const pg = require("pg");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const formidable = require("formidable");
// Importuri pentru Clasele OOP (Etapa 7)
const AccesBD = require("./module_proprii/accesbd.js");
const { Utilizator } = require("./module_proprii/utilizator.js");
const Drepturi = require("./module_proprii/drepturi.js");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: "parola_secreta_proiect",
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2
    }
}));

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
global.client = client;


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
    "fisiere_uploadate",
    "poze_uploadate"
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
// GESTIUNE UTILIZATORI (OOP - ETAPA 7)
//================================================

app.get("/login", function(req,res){
    res.render("pagini/login");
});

app.post("/login",function(req, res){
    let formular = new formidable.IncomingForm();
    formular.parse(req, function(err, campuriText, campuriFisier ){
        let parametriCallback = {
            req: req,
            res: res,
            parola: campuriText.parola[0]
        }
        
        Utilizator.getUtilizDupaUsername(campuriText.username[0], parametriCallback, function(u, obparam, eroare){
            if(!u) {
                obparam.req.session.mesajLogin = "Utilizatorul nu exista!";
                return obparam.res.redirect("/login");
            }
            
            let parolaCriptata = Utilizator.criptareParola(obparam.parola);
            // Verifica daca parola coincide si daca mailul este confirmat
            if(u.parola == parolaCriptata && u.confirmat_mail){
                u.poza = u.poza ? path.join("poze_uploadate", u.username, u.poza) : "";
                obparam.req.session.utilizator = u;               
                obparam.req.session.mesajLogin = "Bravo! Te-ai logat!";
                obparam.res.redirect("/index");
            }
            else{
                console.log("Eroare logare");
                obparam.req.session.mesajLogin = "Date logare incorecte sau nu a fost confirmat mailul!";
                obparam.res.redirect("/login");
            }
        });
    });
});

app.get("/logout", function(req,res){
    req.session.destroy();
    res.locals.utilizator = null;
    res.redirect("/");
});

app.get("/inregistrare", function(req,res){
    res.render("pagini/inregistrare");
});

app.post("/inregistrare",function(req, res){
    let username, poza;
    let formular = new formidable.IncomingForm();
    
    formular.parse(req, function(err, campuriText, campuriFisier ){
        let eroare = "";
        let utilizNou = new Utilizator();
        try{
            utilizNou.setareNume = campuriText.nume[0];
            utilizNou.setareUsername = campuriText.username[0];
            utilizNou.email = campuriText.email[0];
            utilizNou.prenume = campuriText.prenume[0];
            utilizNou.parola = campuriText.parola[0];
            utilizNou.culoare_chat = campuriText.culoare_chat[0] || "#000000";
            utilizNou.poza = poza;
            
            Utilizator.getUtilizDupaUsername(campuriText.username[0], {}, function(u, parametru, eroareUser){
                if (eroareUser == -1){ // Nu exista user-ul, se poate salva
                    utilizNou.salvareUtilizator();
                }
                else {
                    eroare += "Mai exista username-ul. ";
                }
                
                if(!eroare){
                    res.render("pagini/inregistrare", {raspuns: "Inregistrare cu succes!"});
                }
                else {
                    res.render("pagini/inregistrare", {err: "Eroare: " + eroare});
                }
            });
        }
        catch(e){
            console.log(e);
            res.render("pagini/inregistrare", {err: "Eroare site; reveniti mai tarziu"});
        }
    });

    formular.on("field", function(nume,val){ 
        if(nume=="username") username = val;
    });

    formular.on("fileBegin", function(nume,fisier){ 
        let folderUser = path.join(__dirname, "poze_uploadate", username);
        if (!fs.existsSync(folderUser)) fs.mkdirSync(folderUser);
        fisier.filepath = path.join(folderUser, fisier.originalFilename);
        poza = fisier.originalFilename;
    });  
});

app.post("/profil", function(req, res){
    if (!req.session.utilizator){
        afisareEroare(res, 403);
        return;
    }
    let formular = new formidable.IncomingForm();
    formular.parse(req,function(err, campuriText, campuriFile){
        let parolaCriptata = Utilizator.criptareParola(campuriText.parola[0]);
        AccesBD.getInstanta().updateParametrizat(
            {
                tabel: "utilizatori",
                campuri: ["nume", "prenume", "email", "culoare_chat"],
                valori: [
                    `${campuriText.nume[0]}`,
                    `${campuriText.prenume[0]}`,
                    `${campuriText.email[0]}`,
                    `${campuriText.culoare_chat[0]}`
                ],
                conditiiAnd: [
                    `parola='${parolaCriptata}'`,
                    `username='${campuriText.username[0]}'`
                ]
            },          
            function(err, rez){
                if(err){
                    console.log(err);
                    afisareEroare(res, 2);
                    return;
                }
                if (rez.rowCount == 0){
                    res.render("pagini/profil", {mesaj: "Update-ul nu s-a realizat. Verificati parola introdusa."});
                    return;
                }
                else{            
                    req.session.utilizator.nume = campuriText.nume[0];
                    req.session.utilizator.prenume = campuriText.prenume[0];
                    req.session.utilizator.email = campuriText.email[0];
                    req.session.utilizator.culoare_chat = campuriText.culoare_chat[0];
                    res.locals.utilizator = req.session.utilizator;
                    res.render("pagini/profil", {mesaj: "Update-ul s-a realizat cu succes."});
                }
            }
        );
    });
});

app.get("/useri", function(req, res){
    if(req?.utilizator?.areDreptul(Drepturi.vizualizareUtilizatori)){
        let obiectComanda = {
            tabel: "utilizatori",
            campuri: ["*"],
            conditiiAnd: []
        };
        AccesBD.getInstanta().select(obiectComanda, function(err, rezQuery){
            res.render("pagini/useri", {useri: rezQuery.rows});
        });
    }
    else{
        afisareEroare(res, 403);
    }
});

app.post("/sterge_utiliz",  function(req, res){
    if(req?.utilizator?.areDreptul(Drepturi.stergereUtilizatori)){
        let formular = new formidable.IncomingForm();
        formular.parse(req,function(err, campuriText, campuriFile){
            let obiectComanda = {
                tabel: "utilizatori",
                conditiiAnd: [`id=${campuriText.id_utiliz[0]}`]
            };
            AccesBD.getInstanta().delete(obiectComanda, function(err, rezQuery){
                res.redirect("/useri");
            });
        });
    }else{
        afisareEroare(res, 403);
    }
});

app.get("/cod/:username/:token",function(req,res){
    try {
        let parametriCallback = { req: req, token: req.params.token };
        Utilizator.getUtilizDupaUsername(req.params.username, parametriCallback, function(u, obparam){
            let parametriCerere = {
                tabel: "utilizatori",
                campuri: { confirmat_mail: true },
                conditiiAnd: [`id=${u.id}`]
            };
            AccesBD.getInstanta().update(parametriCerere, function (err, rezUpdate){
                if(err || rezUpdate.rowCount == 0){
                    afisareEroare(res, 3);
                }
                else{
                    res.render("pagini/confirmare.ejs");
                }
            });
        });
    }
    catch (e){
        console.log(e);
        afisareEroare(res, 2);
    }
});
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

function afisareEroare(res, identificator, titlu, text, imagine){
    let eroare = obGlobal.obErori?.info_erori?.find((elem) => elem.identificator == identificator);
    let errDefault = obGlobal.obErori?.eroare_default;
    
    if(eroare?.status) {
        res.status(eroare.identificator);
    }
    
    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault?.imagine,
        titlu: titlu || eroare?.titlu || errDefault?.titlu,
        text: text || eroare?.text || errDefault?.text,
    });
}


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
// Middleware pentru setarea variabilelor de sesiune si drepturi in EJS
app.use(function(req, res, next){
    res.locals.Drepturi = Drepturi;
    if (req.session.utilizator){
        // Instantiem clasa Utilizator pentru a avea acces la metode precum areDreptul()
        req.utilizator = res.locals.utilizator = new Utilizator(req.session.utilizator);
        res.locals.mesajLogin = req.session.mesajLogin;
    }  
    next();
});


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

 //login
 app.get("/login", function(req,res){

    res.render("pagini/login");
});


app.post("/login", function(req,res){

    let username=req.body.username;
    let parola=req.body.parola;

    client.query(
        `select * from utilizatori
         where username=$1 and parola=$2`,
        [username, parola],
        function(err,rez){

            if(err || rez.rows.length==0){

                return res.render(
                    "pagini/login",
                    {
                        eroare:"Date gresite"
                    }
                );
            }

            req.session.utilizator=
                rez.rows[0];

            res.redirect("/");
        }
    );
});
//logout
app.get("/logout", function(req,res){

    req.session.destroy();

    res.redirect("/");
});
//inregistrare
app.get("/inregistrare", function(req,res){

    res.render("pagini/inregistrare");
});


app.post("/inregistrare", function(req,res){

    let obUtiliz={
        username:req.body.username,
        nume:req.body.nume,
        parola:req.body.parola,
        email:req.body.email
    };

    client.query(
        `insert into utilizatori
        (username,nume,parola,email,rol)
        values($1,$2,$3,$4,'comun')`,
        [
            obUtiliz.username,
            obUtiliz.nume,
            obUtiliz.parola,
            obUtiliz.email
        ],
        function(err,rez){

            if(err){

                console.log(err);

                return res.render(
                    "pagini/inregistrare",
                    {
                        eroare:
                        "Username existent"
                    }
                );
            }

            res.redirect("/login");
        }
    );
});
//utiliz logat
app.use(function(req,res,next){

    res.locals.utilizator =
        req.session.utilizator;

    next();
});
//favorite
app.post("/favorite/:id", function(req,res){

    if(!req.session.utilizator){

        return res.json({
            succes:false
        });
    }

    client.query(
        `insert into favorite
        (id_produs,id_utilizator,data_favorit)
        values($1,$2,current_timestamp)`,

        [
            req.params.id,
            req.session.utilizator.id
        ],

        function(err,rez){

            if(err){

                console.log(err);

                return res.json({
                    succes:false
                });
            }

            res.json({
                succes:true
            });
        }
    );
});
// api numar favorite
app.get("/api/favorite/:id", function(req,res){

    client.query(
        `select count(*) as total
         from favorite
         where id_produs=$1`,
        [req.params.id],

        function(err,rez){

            if(err){

                return res.json({
                    total:0
                });
            }

            res.json({
                total:rez.rows[0].total
            });
        }
    );
});
//schimbare tema
app.post("/schimba-tema", function(req,res){

    res.cookie(
        "tema",
        req.body.tema,
        {
            maxAge:
            1000*60*60*24*365
        }
    );

    res.json({
        succes:true
    });
});
// pagina produs individual
app.get("/produs/:id", function(req,res){

    client.query(
        `select * from produse
         where id=$1`,
        [req.params.id],

        function(err,rez){

            if(err || rez.rows.length==0){

                afisareEroare(res,404);

                return;
            }

            let produs=
                rez.rows[0];

            client.query(
                `select * from produse
                 where categorie=$1
                 and id<>$2
                 limit 4`,

                [
                    produs.categorie,
                    produs.id
                ],

                function(err2,rez2){

                    res.render(
                        "pagini/produs",
                        {
                            prod:produs,
                            similare:
                            rez2.rows
                        }
                    );
                }
            );
        }
    );
});
//

//================================================
// GALERIE
//================================================

app.get("/galerie", function(req, res){

    if(!obGlobal.obImagini){

        return res.send("Imaginile nu sunt incarcate.");
    }
     //Galerie aniamta
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
//galeria statica
    let acum = new Date();

    let oraCurenta =
        acum.getHours().toString().padStart(2, '0')
        + ":"
        + acum.getMinutes().toString().padStart(2, '0');

    let imaginiFiltrateTimp =
        obGlobal.obImagini.imagini.filter(img => {

            let [oraStart, oraSfarsit] =
                img.timp.split("-");

           if(oraStart <= oraSfarsit){

    return (
        oraCurenta >= oraStart
        &&
        oraCurenta <= oraSfarsit
    );
}

// interval peste miezul nopții
return (
    oraCurenta >= oraStart
    ||
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

    let queryProduse = "select * from produse";

    let queryOptiuni = `
        select distinct categorie
        from produse
        order by categorie
    `;

    client.query(queryProduse, function(err, rezultat){

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

        client.query(queryOptiuni, function(errOpt, rezOpt){

            if(errOpt){

                console.log(errOpt);

                res.render("pagini/produse", {
                    produse: rezultat.rows,
                    optiuni: []
                });

                return;
            }

            res.render(
                "pagini/produse",
                {
                    produse: rezultat.rows,
                    optiuni: rezOpt.rows
                }
            );
        });
    });
});
//================================================
// PRODUS INDIVIDUAL
//================================================

app.get("/produs/:id", function(req, res){

    client.query(
        "select * from produse where id=$1",
        [req.params.id],
        function(err, rezultat){

            if(err || rezultat.rows.length == 0){

                console.log(err);

                afisareEroare(
                    res,
                    404,
                    "Produs inexistent",
                    "Albumul cautat nu exista."
                );

                return;
            }

            res.render(
                "pagini/produs",
                {
                    prod: rezultat.rows[0]
                }
            );
        }
    );
});


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