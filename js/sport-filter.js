/**
 * Barra de navegación / filtro por deporte (chips reutilizable).
 * Persistencia en sessionStorage por rol.
 */
(function (global) {
    function normalize(str) {
        return String(str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function readStored(key) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function writeStored(key, val) {
        try {
            sessionStorage.setItem(key, JSON.stringify(val));
        } catch {
            /* noop */
        }
    }

    /**
     * @param {HTMLElement} mountEl - contenedor (se vacía y se rellena)
     * @param {Array<{id:number,name:string}>} sports
     * @param {{ storageKey: string, onChange: (sel: {all:boolean, sportId?:number, sportName?:string}) => void }} opts
     */
    function mountSportRail(mountEl, sports, opts) {
        if (!mountEl) return;
        const storageKey = opts.storageKey || "sport_filter";
        const saved = readStored(storageKey);
        let selected =
            saved && typeof saved === "object"
                ? saved
                : { all: true, sportId: null, sportName: null };

        mountEl.innerHTML = "";
        const shell = document.createElement("div");
        shell.className = "sport-rail-shell";

        const header = document.createElement("div");
        header.className = "sport-rail-header";
        header.innerHTML = `
            <span class="sport-rail-header__icon" aria-hidden="true">◎</span>
            <div>
                <p class="sport-rail-header__title">Ver por deporte</p>
                <p class="sport-rail-header__hint">Filtra la vista para enfocarte en una sola actividad</p>
            </div>
        `;
        shell.appendChild(header);

        const rail = document.createElement("div");
        rail.className = "sport-rail";
        rail.setAttribute("role", "group");
        rail.setAttribute("aria-label", "Filtrar por deporte");

        function mkChip(label, isAll, sportId, sportName) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "sport-chip";
            b.textContent = label;
            if (isAll) {
                b.dataset.mode = "all";
            } else {
                b.dataset.mode = "sport";
                b.dataset.sportId = String(sportId);
                b.dataset.sportName = sportName || label;
            }
            const active =
                (isAll && selected.all) ||
                (!isAll &&
                    !selected.all &&
                    selected.sportId != null &&
                    Number(selected.sportId) === Number(sportId));
            if (active) b.classList.add("is-active");
            return b;
        }

        const btnAll = mkChip("Todos", true);
        rail.appendChild(btnAll);

        (sports || []).forEach((s) => {
            const nm = s.name || s.nombre || "—";
            rail.appendChild(mkChip(nm, false, s.id, nm));
        });

        shell.appendChild(rail);
        mountEl.appendChild(shell);

        function setActive(btn) {
            rail.querySelectorAll(".sport-chip").forEach((x) => x.classList.remove("is-active"));
            btn.classList.add("is-active");
        }

        function applyFromButton(btn) {
            if (btn.dataset.mode === "all") {
                selected = { all: true, sportId: null, sportName: null };
            } else {
                selected = {
                    all: false,
                    sportId: Number(btn.dataset.sportId),
                    sportName: btn.dataset.sportName || "",
                };
            }
            writeStored(storageKey, selected);
            setActive(btn);
            opts.onChange(selected);
        }

        rail.addEventListener("click", (ev) => {
            const btn = ev.target.closest(".sport-chip");
            if (!btn) return;
            applyFromButton(btn);
        });

        /* activar chip guardado al montar */
        if (!selected.all && selected.sportId != null) {
            const match = rail.querySelector(
                `.sport-chip[data-mode="sport"][data-sport-id="${selected.sportId}"]`
            );
            if (match) {
                setActive(match);
            } else {
                setActive(btnAll);
                selected = { all: true, sportId: null, sportName: null };
                writeStored(storageKey, selected);
            }
        } else {
            setActive(btnAll);
        }

        return {
            getSelection: () => ({ ...selected }),
            setAll: () => {
                setActive(btnAll);
                selected = { all: true, sportId: null, sportName: null };
                writeStored(storageKey, selected);
                opts.onChange(selected);
            },
        };
    }

    function matchesSelection(deporteCellText, selection) {
        if (!selection || selection.all) return true;
        const a = normalize(deporteCellText);
        const b = normalize(selection.sportName || "");
        return a === b || a.includes(b) || b.includes(a);
    }

    global.SportFilter = {
        mountSportRail,
        normalize,
        matchesSelection,
        readStored,
    };
})(window);
