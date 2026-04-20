/**
 * Componentes UI reutilizables (tarjetas deporte, modal, acordeón, KPI).
 * Sin dependencias; usa clases CSS en components.css
 */
(function (global) {
    function normalizeSportKey(name) {
        const n = String(name || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (/fut|soccer/.test(n)) return "futbol";
        if (/basket|baloncest/.test(n)) return "basket";
        if (/vole|volley/.test(n)) return "voleibol";
        if (/tenis|tennis/.test(n)) return "tenis";
        if (/nat/.test(n)) return "natacion";
        if (/atlet/.test(n)) return "atletismo";
        if (/yoga|pilates/.test(n)) return "fitness";
        return "default";
    }

    /**
     * @returns {HTMLElement}
     */
    function sportThumb(key) {
        const k = key || "default";
        const el = document.createElement("div");
        el.className = `sport-thumb sport-thumb--${k}`;
        el.setAttribute("role", "img");
        el.setAttribute("aria-hidden", "true");
        return el;
    }

    /**
     * @param {{ title: string, subtitle?: string, metaLines?: string[], scheduleId: number, onDetail?: function, onEnroll?: function }} opts
     */
    function createClassCard(opts) {
        const key = normalizeSportKey(opts.title);
        const art = document.createElement("article");
        art.className = "class-card";
        art.innerHTML = `
            <div class="class-card__media"></div>
            <div class="class-card__body">
                <p class="class-card__eyebrow">Clase abierta</p>
                <h3 class="class-card__title"></h3>
                <ul class="class-card__facts"></ul>
                <div class="class-card__actions">
                    <button type="button" class="btn btn--ghost btn--sm js-detail">Ver detalle</button>
                    <button type="button" class="btn btn--primary js-enroll">Inscribirme</button>
                </div>
            </div>
        `;
        art.querySelector(".class-card__title").textContent = opts.title || "—";
        const facts = art.querySelector(".class-card__facts");
        (opts.metaLines || []).forEach((line) => {
            const li = document.createElement("li");
            li.textContent = line;
            facts.appendChild(li);
        });
        art.querySelector(".class-card__media").appendChild(sportThumb(key));

        const sid = opts.scheduleId;
        art.querySelector(".js-detail").addEventListener("click", () => {
            if (opts.onDetail) opts.onDetail(sid, art);
        });
        art.querySelector(".js-enroll").addEventListener("click", () => {
            if (opts.onEnroll) opts.onEnroll(sid, art);
        });
        return art;
    }

    let modalEl = null;
    let modalEscapeHandler = null;

    function ensureModal() {
        if (modalEl) return modalEl;
        modalEl = document.createElement("div");
        modalEl.className = "modal-overlay";
        modalEl.setAttribute("hidden", "");
        /* El botón cerrar va al final del diálogo para quedar encima en el orden de pintura (evita que el título capture el clic). */
        modalEl.innerHTML = `
            <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title" class="modal-title"></h2>
                <div class="modal-body"></div>
                <button type="button" class="modal-close btn btn--ghost btn--sm" aria-label="Cerrar">×</button>
            </div>
        `;
        document.body.appendChild(modalEl);

        const closeBtn = modalEl.querySelector(".modal-close");
        function onCloseBtnClick(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", onCloseBtnClick);
        }

        modalEl.addEventListener(
            "click",
            (e) => {
                if (e.target === modalEl) closeModal();
            },
            false
        );

        modalEscapeHandler = (e) => {
            if (e.key === "Escape" && modalEl && !modalEl.hasAttribute("hidden")) {
                e.preventDefault();
                closeModal();
            }
        };
        document.addEventListener("keydown", modalEscapeHandler);

        return modalEl;
    }

    function openModal({ title, bodyHtml }) {
        const m = ensureModal();
        m.querySelector(".modal-title").textContent = title || "";
        m.querySelector(".modal-body").innerHTML = bodyHtml || "";
        m.removeAttribute("hidden");
        m.style.display = "";
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.setAttribute("hidden", "");
        modalEl.style.display = "none";
        document.body.style.overflow = "";
    }

    function statCard({ label, value, hint }) {
        const el = document.createElement("article");
        el.className = "kpi-card";
        el.innerHTML = `
            <p class="kpi-card__label"></p>
            <p class="kpi-card__value"></p>
            <p class="kpi-card__hint"></p>
        `;
        el.querySelector(".kpi-card__label").textContent = label;
        el.querySelector(".kpi-card__value").textContent = String(value);
        el.querySelector(".kpi-card__hint").textContent = hint || "";
        return el;
    }

    function accordionSection({ title, contentEl }) {
        const wrap = document.createElement("div");
        wrap.className = "accordion-item";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "accordion-trigger";
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = `<span class="accordion-title"></span><span class="accordion-icon" aria-hidden="true">▼</span>`;
        btn.querySelector(".accordion-title").textContent = title;
        const panel = document.createElement("div");
        panel.className = "accordion-panel";
        panel.hidden = true;
        panel.appendChild(contentEl);

        btn.addEventListener("click", () => {
            const open = panel.hidden;
            panel.hidden = !open;
            btn.setAttribute("aria-expanded", open ? "true" : "false");
        });
        wrap.appendChild(btn);
        wrap.appendChild(panel);
        return wrap;
    }

    global.UIX = {
        normalizeSportKey,
        sportThumb,
        createClassCard,
        openModal,
        closeModal,
        statCard,
        accordionSection,
    };
})(window);
