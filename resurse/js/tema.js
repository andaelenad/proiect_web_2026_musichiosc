
window.addEventListener("load", function(){

    // support both the header button (`schimba-tema`) and the switch input (`btn-schimba-tema`)
    const btns = [];
    const b1 = document.getElementById("btn-schimba-tema");
    const b2 = document.getElementById("schimba-tema");
    if(b1) btns.push(b1);
    if(b2) btns.push(b2);

    const themes = ["light", "dark", "ocean"]; // cycle order

    let tema = localStorage.getItem("tema");

    // fallback to cookie 'tema' if localStorage is empty (server may have set it)
    if(!tema){
        const m = document.cookie.match(/(?:^|; )tema=([^;]+)/);
        if(m) tema = decodeURIComponent(m[1]);
    }

    if(!tema || themes.indexOf(tema) === -1){
        tema = "light";
    }

    document.documentElement.setAttribute("data-bs-theme", tema);
    schimbaIcon(tema);

    function cycleTheme(){
        let cur = document.documentElement.getAttribute("data-bs-theme") || "light";
        let idx = themes.indexOf(cur);
        idx = (idx + 1) % themes.length;
        const next = themes[idx];
        document.documentElement.setAttribute("data-bs-theme", next);
        localStorage.setItem("tema", next);
        schimbaIcon(next);
    }

    for(const el of btns){
        el.addEventListener("click", function(e){
            // if this is a checkbox input, prevent default toggling interference
            cycleTheme();
        });
    }

    // also support radio inputs with name=theme (head selector)
    const radios = document.querySelectorAll('input[name="theme"]');
    if(radios && radios.length){
        radios.forEach(r => {
            r.addEventListener('change', function(e){
                if(this.checked){
                    const val = this.value;
                    if(themes.indexOf(val) !== -1){
                        document.documentElement.setAttribute('data-bs-theme', val);
                        localStorage.setItem('tema', val);
                        schimbaIcon(val);
                    }
                }
            });
        });

        // set radio checked based on current theme
        const curTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
        const active = document.querySelector('input[name="theme"][value="' + curTheme + '"]');
        if(active) active.checked = true;
    }

    function schimbaIcon(tema){
        // find any theme icon inside known controls (preference: switch, then button)
        let icon = null;
        if(b1) icon = b1.querySelector("i");
        if(!icon && b2) icon = b2.querySelector("i");
        // fallback: dedicated icon element used in some pages
        if(!icon) icon = document.getElementById("icon-tema");
        if(!icon) return;

        if(tema === "dark"){
            icon.className = "bi bi-sun-fill"; // show sun to indicate switch to light
        } else if(tema === "ocean"){
            icon.className = "bi bi-droplet-fill";
        } else {
            icon.className = "bi bi-moon-fill"; // light theme -> show moon
        }
    }
});