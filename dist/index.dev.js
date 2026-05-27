"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var express = require("express");

var path = require("path");

var fs = require("fs");

var sass = require("sass");

var sharp = require("sharp");

var pg = require("pg");

var session = require("express-session");

var cookieParser = require("cookie-parser");

var app = express();
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: "parola_secreta_proiect",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2
  }
}));
app.set("view engine", "ejs"); //================================================
// CONECTARE POSTGRES
//================================================

var Client = pg.Client;
var client = new Client({
  database: "magazincd",
  user: "andaelena1",
  password: "parola123",
  host: "localhost",
  port: 5432
});
client.connect(function (err) {
  if (err) {
    console.log("Eroare conectare PostgreSQL");
    console.log(err);
  } else {
    console.log("Conectat PostgreSQL");
  }
}); //================================================
// OBIECT GLOBAL
//================================================

obGlobal = {
  obErori: null,
  obImagini: null,
  folderScss: path.join(__dirname, "resurse/scss"),
  folderCss: path.join(__dirname, "resurse/css"),
  folderBackup: path.join(__dirname, "backup")
}; //================================================
// INFO SERVER
//================================================

console.log("Folder index.js:", __dirname);
console.log("Folder curent:", process.cwd());
console.log("Cale fisier:", __filename); //================================================
// CREARE FOLDERE
//================================================

var vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];

for (var _i = 0, _vect_foldere = vect_foldere; _i < _vect_foldere.length; _i++) {
  var folder = _vect_foldere[_i];
  var caleFolder = path.join(__dirname, folder);

  if (!fs.existsSync(caleFolder)) {
    fs.mkdirSync(caleFolder, {
      recursive: true
    });
  }
} //================================================
// INIT ERORI
//================================================


function initErori() {
  var continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
  var erori = JSON.parse(continut);
  obGlobal.obErori = erori;
  var err_default = erori.eroare_default;
  err_default.imagine = path.join(erori.cale_baza, err_default.imagine);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = erori.info_erori[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var eroare = _step.value;
      eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

initErori(); //================================================
// INIT IMAGINI
//================================================

function initImagini() {
  var continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
  obGlobal.obImagini = JSON.parse(continut);
  var vImagini = obGlobal.obImagini.imagini;
  var caleGalerie = obGlobal.obImagini.cale_galerie;
  var caleAbs = path.join(__dirname, caleGalerie);
  var caleAbsMediu = path.join(caleAbs, "mediu");

  if (!fs.existsSync(caleAbsMediu)) {
    fs.mkdirSync(caleAbsMediu);
  }

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = vImagini[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var imag = _step2.value;
      var parti = imag.fisier_imagine.split(".");
      var ext = parti.pop();
      var numeFis = parti.join(".");
      var caleFisAbs = path.join(caleAbs, imag.fisier_imagine);
      var caleFisMediuAbs = path.join(caleAbsMediu, numeFis + ".webp");

      if (fs.existsSync(caleFisAbs)) {
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs)["catch"](function (err) {});
      }

      imag.fisier_mediu = "/" + caleGalerie + "/mediu/" + numeFis + ".webp";
      imag.fisier = "/" + caleGalerie + "/" + imag.fisier_imagine;
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
        _iterator2["return"]();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
}

initImagini(); //================================================
// FISIERE STATICE
//================================================

app.use("/resurse", express["static"](path.join(__dirname, "resurse")));
app.use("/dist", express["static"](path.join(__dirname, "node_modules/bootstrap/dist"))); //================================================
// FAVICON
//================================================

app.get("/favicon.ico", function (req, res) {
  res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
}); //================================================
// PAGINA PRINCIPALA
//================================================

app.get(["/", "/index", "/home"], function (req, res) {
  res.render("pagini/index", {
    ip: req.ip,
    imagini: obGlobal.obImagini ? obGlobal.obImagini.imagini : []
  });
}); //login

app.get("/login", function (req, res) {
  res.render("pagini/login");
});
app.post("/login", function (req, res) {
  var username = req.body.username;
  var parola = req.body.parola;
  client.query("select * from utilizatori\n         where username=$1 and parola=$2", [username, parola], function (err, rez) {
    if (err || rez.rows.length == 0) {
      return res.render("pagini/login", {
        eroare: "Date gresite"
      });
    }

    req.session.utilizator = rez.rows[0];
    res.redirect("/");
  });
}); //logout

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
}); //inregistrare

app.get("/inregistrare", function (req, res) {
  res.render("pagini/inregistrare");
});
app.post("/inregistrare", function (req, res) {
  var obUtiliz = {
    username: req.body.username,
    nume: req.body.nume,
    parola: req.body.parola,
    email: req.body.email
  };
  client.query("insert into utilizatori\n        (username,nume,parola,email,rol)\n        values($1,$2,$3,$4,'comun')", [obUtiliz.username, obUtiliz.nume, obUtiliz.parola, obUtiliz.email], function (err, rez) {
    if (err) {
      console.log(err);
      return res.render("pagini/inregistrare", {
        eroare: "Username existent"
      });
    }

    res.redirect("/login");
  });
}); //utiliz logat

app.use(function (req, res, next) {
  res.locals.utilizator = req.session.utilizator;
  next();
}); //favorite

app.post("/favorite/:id", function (req, res) {
  if (!req.session.utilizator) {
    return res.json({
      succes: false
    });
  }

  client.query("insert into favorite\n        (id_produs,id_utilizator,data_favorit)\n        values($1,$2,current_timestamp)", [req.params.id, req.session.utilizator.id], function (err, rez) {
    if (err) {
      console.log(err);
      return res.json({
        succes: false
      });
    }

    res.json({
      succes: true
    });
  });
}); // api numar favorite

app.get("/api/favorite/:id", function (req, res) {
  client.query("select count(*) as total\n         from favorite\n         where id_produs=$1", [req.params.id], function (err, rez) {
    if (err) {
      return res.json({
        total: 0
      });
    }

    res.json({
      total: rez.rows[0].total
    });
  });
}); //schimbare tema

app.post("/schimba-tema", function (req, res) {
  res.cookie("tema", req.body.tema, {
    maxAge: 1000 * 60 * 60 * 24 * 365
  });
  res.json({
    succes: true
  });
}); // pagina produs individual

app.get("/produs/:id", function (req, res) {
  client.query("select * from produse\n         where id=$1", [req.params.id], function (err, rez) {
    if (err || rez.rows.length == 0) {
      afisareEroare(res, 404);
      return;
    }

    var produs = rez.rows[0];
    client.query("select * from produse\n                 where categorie=$1\n                 and id<>$2\n                 limit 4", [produs.categorie, produs.id], function (err2, rez2) {
      res.render("pagini/produs", {
        prod: produs,
        similare: rez2.rows
      });
    });
  });
}); //
//================================================
// GALERIE
//================================================

app.get("/galerie", function (req, res) {
  if (!obGlobal.obImagini) {
    return res.send("Imaginile nu sunt incarcate.");
  } //Galerie aniamta


  var imaginiPare = obGlobal.obImagini.imagini.filter(function (img, idx) {
    return idx % 2 === 0;
  });
  var puteri = [2, 4, 8, 16];
  var nrAleator = puteri[Math.floor(Math.random() * puteri.length)];
  var imaginiSelectate = imaginiPare.slice(0, nrAleator);
  var caleScssAnimata = path.join(obGlobal.folderScss, "galerie.scss");

  if (fs.existsSync(caleScssAnimata)) {
    var continutScss = fs.readFileSync(caleScssAnimata, "utf8");
    var scssCuVariabile = "$nrimag:".concat(nrAleator, ";\n") + continutScss;

    try {
      var rez = sass.compileString(scssCuVariabile, {
        loadPaths: [obGlobal.folderScss]
      });
      fs.writeFileSync(path.join(obGlobal.folderCss, "galerie.css"), rez.css);
    } catch (err) {
      console.log(err);
    }
  } //galeria statica


  var acum = new Date();
  var oraCurenta = acum.getHours().toString().padStart(2, '0') + ":" + acum.getMinutes().toString().padStart(2, '0');
  var imaginiFiltrateTimp = obGlobal.obImagini.imagini.filter(function (img) {
    var _img$timp$split = img.timp.split("-"),
        _img$timp$split2 = _slicedToArray(_img$timp$split, 2),
        oraStart = _img$timp$split2[0],
        oraSfarsit = _img$timp$split2[1];

    if (oraStart <= oraSfarsit) {
      return oraCurenta >= oraStart && oraCurenta <= oraSfarsit;
    } // interval peste miezul nopții


    return oraCurenta >= oraStart || oraCurenta <= oraSfarsit;
  }).slice(0, 10);
  res.render("pagini/galerie", {
    ip: req.ip,
    imagini: imaginiFiltrateTimp,
    imaginiAnimatie: imaginiSelectate,
    cale_galerie: obGlobal.obImagini.cale_galerie
  });
}); //================================================
// PRODUSE DIN BAZA DE DATE
//================================================

app.get("/produse", function (req, res) {
  var queryProduse = "select * from produse";
  var queryOptiuni = "\n        select distinct categorie\n        from produse\n        order by categorie\n    ";
  client.query(queryProduse, function (err, rezultat) {
    if (err) {
      console.log(err);
      afisareEroare(res, 2, "Eroare baza de date", "Nu se pot incarca produsele.");
      return;
    }

    client.query(queryOptiuni, function (errOpt, rezOpt) {
      if (errOpt) {
        console.log(errOpt);
        res.render("pagini/produse", {
          produse: rezultat.rows,
          optiuni: []
        });
        return;
      }

      res.render("pagini/produse", {
        produse: rezultat.rows,
        optiuni: rezOpt.rows
      });
    });
  });
}); //================================================
// PRODUS INDIVIDUAL
//================================================

app.get("/produs/:id", function (req, res) {
  client.query("select * from produse where id=$1", [req.params.id], function (err, rezultat) {
    if (err || rezultat.rows.length == 0) {
      console.log(err);
      afisareEroare(res, 404, "Produs inexistent", "Albumul cautat nu exista.");
      return;
    }

    res.render("pagini/produs", {
      prod: rezultat.rows[0]
    });
  });
}); //================================================
// COMPILARE SCSS
//================================================

function compileazaScss(caleScss, caleCss) {
  var numeFisExt = path.basename(caleScss);
  var numeFis = numeFisExt.replace(/\.scss$/, '');

  if (!caleCss) {
    caleCss = numeFis + ".css";
  }

  if (!path.isAbsolute(caleScss)) {
    caleScss = path.join(obGlobal.folderScss, caleScss);
  }

  if (!path.isAbsolute(caleCss)) {
    caleCss = path.join(obGlobal.folderCss, caleCss);
  }

  var caleBackup = path.join(obGlobal.folderBackup, "resurse/css");

  if (!fs.existsSync(caleBackup)) {
    fs.mkdirSync(caleBackup, {
      recursive: true
    });
  }

  var numeFisCss = path.basename(caleCss);

  if (fs.existsSync(caleCss)) {
    var timestamp = Date.now();
    fs.copyFileSync(caleCss, path.join(caleBackup, timestamp + "_" + numeFisCss));
  }

  try {
    var rez = sass.compile(caleScss, {
      sourceMap: true
    });
    fs.writeFileSync(caleCss, rez.css);
  } catch (err) {
    console.log(err.message);
  }
} //================================================
// WATCH SCSS
//================================================


if (fs.existsSync(obGlobal.folderScss)) {
  var vFisiere = fs.readdirSync(obGlobal.folderScss);
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = vFisiere[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var numeFis = _step3.value;

      if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis);
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
        _iterator3["return"]();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  fs.watch(obGlobal.folderScss, function (eveniment, numeFis) {
    if ((eveniment == "change" || eveniment == "rename") && numeFis.endsWith(".scss")) {
      var caleCompleta = path.join(obGlobal.folderScss, numeFis);

      if (fs.existsSync(caleCompleta)) {
        compileazaScss(caleCompleta);
      }
    }
  });
} //================================================
// RUTE GENERALE
//================================================


app.get(/^\/(.*)/, function (req, res) {
  var cerereCale = req.params[0];

  if (!cerereCale || cerereCale === "/") {
    return;
  }

  if (req.path.startsWith("/resurse") && path.extname(req.path) == "") {
    afisareEroare(res, 403);
    return;
  }

  if (path.extname(req.path) == ".ejs") {
    afisareEroare(res, 400);
    return;
  }

  try {
    res.render("pagini/" + cerereCale, {
      ip: req.ip
    }, function (err, rezRandare) {
      if (err) {
        if (err.message.includes("Failed to lookup view")) {
          afisareEroare(res, 404);
        } else {
          afisareEroare(res, 500, "Eroare randare", "A aparut o problema.");
        }
      } else {
        res.send(rezRandare);
      }
    });
  } catch (err) {
    afisareEroare(res, 404);
  }
}); //================================================
// SERVER
//================================================

app.listen(8080, function () {
  console.log("Server pornit pe http://localhost:8080");
});