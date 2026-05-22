window.addEventListener("DOMContentLoaded", function() {
    let btnTema = document.getElementById("btn-schimba-tema");
    let iconTema = document.getElementById("icon-tema");

    // localstorage
    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
        if (btnTema) btnTema.checked = true; 
        if (iconTema) {
            iconTema.classList.remove("fa-sun");
            iconTema.classList.add("fa-moon"); // luna dark
        }
    } else {
        document.body.classList.remove("dark");
        if (btnTema) btnTema.checked = false; 
        if (iconTema) {
            iconTema.classList.remove("fa-moon");
            iconTema.classList.add("fa-sun"); // soare light
        }
    }

    // 
    if (btnTema) {
        btnTema.onchange = function() {
            if (this.checked) {
                // dark mode
                document.body.classList.add("dark");
                localStorage.setItem("tema", "dark"); // memorat in localStorage
                if (iconTema) {
                    iconTema.classList.remove("fa-sun");
                    iconTema.classList.add("fa-moon"); // luna
                }
            } else {
                // light mode
                document.body.classList.remove("dark");
                localStorage.setItem("tema", "light"); // memorat in localStorage
                if (iconTema) {
                    iconTema.classList.remove("fa-moon");
                    iconTema.classList.add("fa-sun"); // soare
                }
            }
        };
    }
});