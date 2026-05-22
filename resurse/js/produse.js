window.onload = function () {

    // range pret
    document.getElementById("inp-pret").oninput = function () {
        let val = this.value.trim();
        document.getElementById("infoRange").innerHTML = `(${val} lei)`;
    }


    // filtrare
    document.getElementById("filtrare").onclick = function () {

        let inpNumeRaw = document.getElementById("inp-nume").value;
        let inpArtistRaw = document.getElementById("inp-artist").value;

        let valid = true;

        // validare album
        if (/\d/.test(inpNumeRaw)) {
            alert("Numele albumului nu poate conține cifre!");

            document.getElementById("inp-nume").classList.add("is-invalid");

            valid = false;
        }
        else {
            document.getElementById("inp-nume").classList.remove("is-invalid");
        }


        // validare artist
        if (/\d/.test(inpArtistRaw)) {
            alert("Numele artistului nu poate conține cifre!");

            document.getElementById("inp-artist").classList.add("is-invalid");

            valid = false;
        }
        else {
            document.getElementById("inp-artist").classList.remove("is-invalid");
        }


        if (!valid) {
            return;
        }


        let inpNume = inpNumeRaw.trim().toLowerCase();

        let inpArtist = inpArtistRaw.trim().toLowerCase();

        let inpPret = parseFloat(
            document.getElementById("inp-pret").value
        );

        let inpCategorie =
            document.getElementById("inp-categorie")
            .value
            .trim()
            .toLowerCase();

        let editieLimitata =
            document.getElementById("inp-editie").checked;


        let produse =
            document.getElementsByClassName("produs");


        for (let prod of produse) {

            prod.style.display = "none";


            let nume =
                prod.getElementsByClassName("val-nume")[0]
                .innerHTML
                .trim()
                .toLowerCase();

            let artist =
                prod.getElementsByClassName("val-artist")[0]
                .innerHTML
                .trim()
                .toLowerCase();

            let categorie =
                prod.getElementsByClassName("val-categorie")[0]
                .innerHTML
                .trim()
                .toLowerCase();

            let pret =
                parseFloat(
                    prod.getElementsByClassName("val-pret")[0]
                    .innerHTML
                    .trim()
                );

            let editie =
                prod.innerHTML.toLowerCase().includes("da");


            let cond1 = nume.includes(inpNume);

            let cond2 = artist.includes(inpArtist);

            let cond3 = pret >= inpPret;

            let cond4 =
                (categorie == inpCategorie ||
                    inpCategorie == "toate");

            let cond5 =
                (!editieLimitata || editie);


            if (
                cond1 &&
                cond2 &&
                cond3 &&
                cond4 &&
                cond5
            ) {
                prod.style.display = "block";
            }
        }
    }



    // resetare
    document.getElementById("resetare").onclick = function () {

        if (confirm("Sigur doriți resetarea filtrelor?")) {

            document.getElementById("inp-nume").value = "";

            document.getElementById("inp-artist").value = "";

            document.getElementById("inp-pret").value = 0;

            document.getElementById("infoRange").innerHTML = "(0 lei)";

            document.getElementById("inp-categorie").value = "toate";

            document.getElementById("inp-editie").checked = false;


            document
                .getElementById("inp-nume")
                .classList
                .remove("is-invalid");

            document
                .getElementById("inp-artist")
                .classList
                .remove("is-invalid");


            let container =
                document.querySelector(".grid-produse");

            let produse =
                Array.from(
                    container.getElementsByClassName("produs")
                );


            produse.sort(function (a, b) {

                let idA =
                    parseInt(a.id.split("_")[1]);

                let idB =
                    parseInt(b.id.split("_")[1]);

                return idA - idB;
            });


            for (let prod of produse) {

                prod.style.display = "block";

                container.appendChild(prod);
            }
        }
    }



    // sortare
    function sorteaza(semn) {

        let produse =
            document.getElementsByClassName("produs");

        let vProduse =
            Array.from(produse);


        vProduse.sort(function (a, b) {

            let pretA =
                parseFloat(
                    a.getElementsByClassName("val-pret")[0]
                    .innerHTML
                    .trim()
                );

            let pretB =
                parseFloat(
                    b.getElementsByClassName("val-pret")[0]
                    .innerHTML
                    .trim()
                );


            if (pretA == pretB) {

                let numeA =
                    a.getElementsByClassName("val-nume")[0]
                    .innerHTML
                    .trim()
                    .toLowerCase();

                let numeB =
                    b.getElementsByClassName("val-nume")[0]
                    .innerHTML
                    .trim()
                    .toLowerCase();

                return semn * numeA.localeCompare(numeB);
            }

            return semn * (pretA - pretB);
        });


        for (let prod of vProduse) {
            prod.parentElement.appendChild(prod);
        }
    }


    document.getElementById("sortCrescNume").onclick =
        function () {
            sorteaza(1);
        }


    document.getElementById("sortDescrescNume").onclick =
        function () {
            sorteaza(-1);
        }



    // calcul medie
    document.getElementById("calculare").onclick =
        function () {

            let produse =
                document.getElementsByClassName("produs");

            let suma = 0;

            let nr = 0;


            for (let prod of produse) {

                if (prod.style.display != "none") {

                    suma += parseFloat(
                        prod.getElementsByClassName("val-pret")[0]
                        .innerHTML
                        .trim()
                    );

                    nr++;
                }
            }


            let media =
                nr > 0 ?
                    (suma / nr).toFixed(2)
                    : 0;


            let div =
                document.createElement("div");


            div.id = "calcul-dinamic-fix";


            div.innerHTML =
                `<strong>Statistică MagazinCD</strong><br>
                Albume afișate: ${nr}<br>
                Media prețurilor:
                <strong>${media} lei</strong>`;


            div.style.position = "fixed";

            div.style.bottom = "30px";

            div.style.right = "30px";

            div.style.backgroundColor = "#1e1e1e";

            div.style.color = "white";

            div.style.padding = "15px";

            div.style.borderRadius = "10px";

            div.style.zIndex = "9999";


            document.body.appendChild(div);


            setTimeout(function () {

                if (div)
                    div.remove();

            }, 2000);
        }



    // Alt + c
    window.onkeydown = function (e) {

        if (e.key == "c" && e.altKey) {

            let produse =
                document.getElementsByClassName("produs");

            let suma = 0;


            for (let prod of produse) {

                if (prod.style.display != "none") {

                    suma += parseFloat(
                        prod.getElementsByClassName("val-pret")[0]
                        .innerHTML
                        .trim()
                    );
                }
            }


            let p =
                document.getElementById("infoSuma");


            if (!p) {

                p = document.createElement("p");

                p.id = "infoSuma";

                p.innerHTML =
                    `Suma albumelor afișate:
                    ${suma} lei`;


                let sect =
                    document.getElementById("produse");


                sect.parentElement.insertBefore(
                    p,
                    sect
                );


                setTimeout(function () {

                    let p1 =
                        document.getElementById("infoSuma");

                    if (p1)
                        p1.remove();

                }, 2000);
            }
            else {

                p.innerHTML =
                    `Suma albumelor afișate:
                    ${suma} lei`;
            }
        }
    }
}