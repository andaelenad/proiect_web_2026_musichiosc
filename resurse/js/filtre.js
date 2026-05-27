window.addEventListener("load", function(){

    let chk=
        document.getElementById("salveaza-filtre");

    if(localStorage.getItem("filtre")){

        let filtre=
            JSON.parse(
                localStorage.getItem("filtre")
            );

        document.getElementById("inp-nume")
            .value=filtre.nume;

        document.getElementById("inp-pret")
            .value=filtre.pret;

        document.getElementById("inp-categorie")
            .value=filtre.categorie;

        chk.checked=true;
    }

    document.getElementById("filtrare")
        .addEventListener("click", function(){

            if(chk.checked){

                let obj={
                    nume:
                        document.getElementById("inp-nume").value,

                    pret:
                        document.getElementById("inp-pret").value,

                    categorie:
                        document.getElementById("inp-categorie").value
                };

                localStorage.setItem(
                    "filtre",
                    JSON.stringify(obj)
                );
            }
        });

    document.getElementById("resetare")
        .addEventListener("click", function(){

            localStorage.removeItem("filtre");

            chk.checked=false;
        });
});