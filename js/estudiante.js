/**
 * Panel estudiante — componentes UIX, DataTables, sin IDs visibles.
 */
const P = window.AppPanel;
const U = window.UIX;
const SF = window.SportFilter;
const H = P.H;
const R = P.R;

const STORAGE_SPORT = "sport_filter_estudiante";

function getSportSelection() {
    if (!SF) return { all: true, sportId: null, sportName: null };
    return SF.readStored(STORAGE_SPORT) || { all: true, sportId: null, sportName: null };
}

const DAY_ORDER = ["lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado", "domingo"];

function profLabel(row) {
    const n = row[H.instructor_nombre];
    return n && String(n).trim() ? String(n).trim() : "Por asignar";
}

function daySortKey(dayStr) {
    const d = String(dayStr || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const idx = DAY_ORDER.findIndex((x) => d.includes(x.slice(0, 4)));
    return idx >= 0 ? idx : 99;
}

let notasRowsCache = [];

async function inscribirse(scheduleId) {
    const userId = P.getUserId();
    if (!userId || Number.isNaN(userId)) throw new Error("Sesión no válida");
    const data = await P.fetchJson(`${P.API_BASE}/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, schedule_id: scheduleId }),
    });
    if (data.error) throw new Error(data.error);
    return data;
}

function openDetailModal(row) {
    const sid = row[H.id];
    const lines = [
        `Nivel: ${P.formatCell(row[H.nivel])}`,
        `Lugar / instalación: ${P.formatCell(row[H.lugar])}`,
        `Día: ${P.formatCell(row[H.day])}`,
        `Franja horaria: ${P.formatCell(row[H.hour])}`,
        `Cupos ofrecidos: ${P.formatCell(row[H.capacity])}`,
        `Docente: ${profLabel(row)}`,
    ];
    const html = `
        <ul>
            ${lines.map((l) => `<li>${P.escapeHtml(l)}</li>`).join("")}
        </ul>
        <p style="margin-top:1rem"><button type="button" class="btn btn--primary js-modal-enroll">Confirmar inscripción</button></p>
    `;
    U.openModal({
        title: P.formatCell(row[H.deporte]),
        bodyHtml: html,
    });
    document.querySelector(".js-modal-enroll")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const btn = ev.currentTarget;
        btn.disabled = true;
        try {
            await inscribirse(sid);
            U.closeModal();
            P.showFlash("Te has inscrito correctamente.", "ok");
            await loadMisReservasIfMounted();
        } catch (e) {
            P.showFlash(e.message || "No se pudo completar la inscripción.", "err");
        } finally {
            btn.disabled = false;
        }
    });
}

async function loadClasesDisponibles() {
    const container = document.getElementById("lista-clases");
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const sel = getSportSelection();
        let rows = await P.cargarHorarios();
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[H.deporte]), sel));
        }
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(
                container,
                sel && !sel.all
                    ? "No hay oferta para este deporte con el filtro actual. Prueba «Todos» u otro deporte."
                    : "No hay oferta disponible en este momento.",
                false
            );
            return;
        }

        rows.forEach((row) => {
            const sid = row[H.id];
            const card = U.createClassCard({
                title: P.formatCell(row[H.deporte]),
                scheduleId: sid,
                metaLines: [
                    `${P.formatCell(row[H.nivel])} · ${P.formatCell(row[H.lugar])}`,
                    `${P.formatCell(row[H.day])} · ${P.formatCell(row[H.hour])}`,
                    `Docente: ${profLabel(row)} · Cupos: ${P.formatCell(row[H.capacity])}`,
                ],
                onDetail: () => openDetailModal(row),
                onEnroll: async () => {
                    try {
                        await inscribirse(sid);
                        P.showFlash("Inscripción realizada correctamente.", "ok");
                        await loadMisReservasIfMounted();
                    } catch (e) {
                        P.showFlash(e.message || "No se pudo inscribir.", "err");
                    }
                },
            });
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar las clases.", true);
    }
}

async function loadMisReservasIfMounted() {
    const panel = document.getElementById("panel-reservas");
    if (panel && !panel.hidden) await loadMisReservas();
    const wh = document.getElementById("panel-horarios");
    if (wh && !wh.hidden) await loadMiHorario();
}

async function loadMisReservas() {
    const container = document.getElementById("lista-reservas");
    if (!container) return;
    const userId = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const sel = getSportSelection();
        let rows = await P.cargarReservasUsuario(userId);
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[R.deporte]), sel));
        }
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(
                container,
                sel && !sel.all
                    ? "No tienes inscripciones para este deporte. Cambia el filtro o revisa otras actividades."
                    : "Aún no tienes clases inscritas. Explora «Explorar clases» para comenzar.",
                false
            );
            return;
        }

        rows.forEach((row) => {
            const prof = row[R.instructor_nombre];
            const profTxt = prof && String(prof).trim() ? String(prof).trim() : "Por asignar";
            const div = document.createElement("div");
            div.className = "enroll-card";
            div.innerHTML = `
                <div>
                    <h3 class="enroll-card__title">${P.escapeHtml(P.formatCell(row[R.deporte]))}</h3>
                    <p class="enroll-card__meta">${P.escapeHtml(P.formatCell(row[R.day]))} · ${P.escapeHtml(
                P.formatCell(row[R.hour])
            )}</p>
                    <p class="enroll-card__meta">Docente: ${P.escapeHtml(profTxt)}</p>
                </div>
                <span class="enroll-card__badge">Inscrito</span>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar tus clases.", true);
    }
}

async function loadMiHorario() {
    const container = document.getElementById("week-schedule");
    if (!container) return;
    const userId = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const sel = getSportSelection();
        let rows = await P.cargarReservasUsuario(userId);
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[R.deporte]), sel));
        }
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(
                container,
                sel && !sel.all
                    ? "No hay sesiones de este deporte en tu horario. Prueba otro filtro."
                    : "Cuando te inscribas a una clase, aquí verás tu horario organizado por día.",
                false
            );
            return;
        }

        const byDay = {};
        rows.forEach((row) => {
            const d = P.formatCell(row[R.day]) || "—";
            if (!byDay[d]) byDay[d] = [];
            byDay[d].push(row);
        });
        const days = Object.keys(byDay).sort((a, b) => daySortKey(a) - daySortKey(b));

        days.forEach((day) => {
            const block = document.createElement("section");
            block.className = "week-day-block";
            const h = document.createElement("h3");
            h.className = "week-day-block__head";
            h.textContent = day;
            block.appendChild(h);

            byDay[day]
                .sort((a, b) => String(a[R.hour]).localeCompare(String(b[R.hour])))
                .forEach((row) => {
                    const slot = document.createElement("div");
                    slot.className = "week-slot";
                    const prof = row[R.instructor_nombre];
                    const ptxt = prof && String(prof).trim() ? String(prof).trim() : "Por asignar";
                    slot.innerHTML = `
                        <div class="week-slot__time">${P.escapeHtml(P.formatCell(row[R.hour]))}</div>
                        <div class="week-slot__detail">
                            <strong>${P.escapeHtml(P.formatCell(row[R.deporte]))}</strong>
                            <span>${P.escapeHtml(ptxt)} · ${P.escapeHtml(P.formatCell(row[R.day]))}</span>
                        </div>
                    `;
                    block.appendChild(slot);
                });
            container.appendChild(block);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudo cargar el horario.", true);
    }
}

function bloqueFromReservationId(rid) {
    const n = Number(rid) || 0;
    if (!n) return "—";
    return String((n % 3) + 1);
}

function periodoForRow(rid) {
    const n = Number(rid) || 0;
    return n % 2 === 0 ? "2026-1" : "2026-2";
}

function buildNotasTableData(rows) {
    return rows.map((row) => {
        const rid = row.reservation_id;
        const bloque = bloqueFromReservationId(rid);
        const periodo = periodoForRow(rid);
        const nota =
            row.score !== null && row.score !== undefined && row.score !== ""
                ? P.formatCell(row.score)
                : "Pendiente";
        return {
            deporte: P.formatCell(row.deporte),
            prof: P.formatCell(row.instructor_nombre),
            dia: P.formatCell(row.day),
            hora: P.formatCell(row.hour),
            nota,
            com: row.comment ? String(row.comment) : "—",
            bloque,
            periodo,
            _rid: rid,
        };
    });
}

function applyNotasFilters() {
    const per = document.getElementById("filtro-periodo-notas")?.value || "all";
    const ses = document.getElementById("filtro-sesion-notas")?.value || "all";
    let data = notasRowsCache.slice();

    if (per !== "all") {
        data = data.filter((r) => r.periodo === per);
    }
    if (ses !== "all") {
        data = data.filter((r) => r.bloque === ses);
    }

    const sportSel = getSportSelection();
    if (sportSel && !sportSel.all && SF) {
        data = data.filter((r) => SF.matchesSelection(r.deporte, sportSel));
    }

    const tbody = document.getElementById("tbody-notas-estudiante");
    if (!tbody) return;
    if (window.DT) window.DT.destroyIfAny("#dt-notas-estudiante");
    tbody.innerHTML = "";

    const hintEl = document.getElementById("notas-promedio-global");

    if (data.length === 0) {
        if (hintEl) {
            hintEl.hidden = true;
            hintEl.textContent = "";
        }
        tbody.innerHTML =
            '<tr><td colspan="7" class="empty-state">No hay resultados con los filtros seleccionados.</td></tr>';
        return;
    }

    data.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${P.escapeHtml(r.deporte)}</td>
            <td>${P.escapeHtml(r.prof)}</td>
            <td>${P.escapeHtml(r.dia)}</td>
            <td>${P.escapeHtml(r.hora)}</td>
            <td>${P.escapeHtml(r.nota)}</td>
            <td>${P.escapeHtml(r.com)}</td>
            <td>${P.escapeHtml(r.bloque)}</td>
        `;
        tbody.appendChild(tr);
    });

    const numeric = data
        .map((r) => {
            const x = parseFloat(String(r.nota).replace(",", "."));
            return Number.isFinite(x) ? x : null;
        })
        .filter((x) => x != null);
    if (hintEl && numeric.length) {
        const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
        hintEl.hidden = false;
        hintEl.textContent = `Promedio del filtro actual: ${avg.toFixed(2)} (sobre ${numeric.length} calificación(es) numérica(s)).`;
    } else if (hintEl) {
        hintEl.hidden = true;
    }

    if (window.DT) window.DT.initTable("#dt-notas-estudiante", { order: [[0, "asc"]] });
}

async function loadMisNotas() {
    const userId = P.getUserId();
    const tbody = document.getElementById("tbody-notas-estudiante");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando…</td></tr>';

    try {
        const rows = await P.cargarCalificacionesAlumno(userId);
        if (window.DT) window.DT.destroyIfAny("#dt-notas-estudiante");
        tbody.innerHTML = "";

        if (rows.length === 0) {
            notasRowsCache = [];
            const hp = document.getElementById("notas-promedio-global");
            if (hp) hp.hidden = true;
            tbody.innerHTML =
                '<tr><td colspan="7" class="empty-state">Aún no hay calificaciones registradas.</td></tr>';
            return;
        }

        notasRowsCache = buildNotasTableData(rows);
        applyNotasFilters();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="error-state">${P.escapeHtml(
            e.message || "No se pudieron cargar las calificaciones."
        )}</td></tr>`;
    }
}

function initTabs() {
    const buttons = document.querySelectorAll(".tabs__btn");
    const panels = document.querySelectorAll(".tab-panel");

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const tab = btn.getAttribute("data-tab");
            buttons.forEach((b) => {
                const active = b === btn;
                b.classList.toggle("is-active", active);
                b.setAttribute("aria-selected", active ? "true" : "false");
            });
            panels.forEach((p) => {
                const match = p.getAttribute("data-panel") === tab;
                p.classList.toggle("is-active", match);
                p.hidden = !match;
            });
            P.hideFlash();
            if (tab === "clases") loadClasesDisponibles();
            if (tab === "reservas") loadMisReservas();
            if (tab === "horarios") loadMiHorario();
            if (tab === "notas") loadMisNotas();
        });
    });
}

function refreshActivePanelForSport() {
    const tab = document.querySelector(".tabs__btn.is-active")?.getAttribute("data-tab");
    if (tab === "clases") loadClasesDisponibles();
    if (tab === "reservas") loadMisReservas();
    if (tab === "horarios") loadMiHorario();
    if (tab === "notas" && notasRowsCache.length) applyNotasFilters();
}

async function initSportRail() {
    const mount = document.getElementById("est-sport-rail-mount");
    if (!mount || !SF) return;
    try {
        const sports = await P.cargarSports();
        SF.mountSportRail(mount, sports, {
            storageKey: STORAGE_SPORT,
            onChange: () => refreshActivePanelForSport(),
        });
    } catch (e) {
        mount.innerHTML = "";
    }
}

function init() {
    if (!P.requireRole(P.ROLE.estudiante)) return;

    P.setHeaderName();
    document.getElementById("btn-logout")?.addEventListener("click", P.logout);

    document.getElementById("filtro-periodo-notas")?.addEventListener("change", () => {
        if (notasRowsCache.length) applyNotasFilters();
    });
    document.getElementById("filtro-sesion-notas")?.addEventListener("change", () => {
        if (notasRowsCache.length) applyNotasFilters();
    });

    initTabs();
    initSportRail();
    P.pingApi();
    loadClasesDisponibles();
}

document.addEventListener("DOMContentLoaded", init);
