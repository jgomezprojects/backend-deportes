/**
 * Panel profesor — acordeón por deporte, DataTables, promedio de bloques en calificaciones.
 */
const P = window.AppPanel;
const U = window.UIX;
const SF = window.SportFilter;
const H = P.H;
const R = P.R;

const STORAGE_SPORT = "sport_filter_profesor";

function getSportSelection() {
    if (!SF) return { all: true, sportId: null, sportName: null };
    return SF.readStored(STORAGE_SPORT) || { all: true, sportId: null, sportName: null };
}

let profSessionFilter = 1;

function badgeAsistencia(status) {
    const s = status ? String(status).trim().toUpperCase() : "";
    if (s === "PRESENT" || s === "1" || s === "TRUE" || s === "T") {
        return '<span class="badge-att badge-att--ok">Presente</span>';
    }
    if (s === "ABSENT" || s === "0" || s === "FALSE" || s === "F") {
        return '<span class="badge-att badge-att--no">Ausente</span>';
    }
    return '<span class="badge-att badge-att--pending">Sin marcar</span>';
}

function bloqueReserva(rid) {
    const n = Number(rid) || 0;
    return (n % 3) + 1;
}

async function loadMisClasesTabla() {
    const tbody = document.getElementById("prof-tabla-clases-body");
    if (!tbody) return;
    if (window.DT) window.DT.destroyIfAny("#dt-prof-clases");
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Cargando…</td></tr>';

    try {
        const uid = P.getUserId();
        const sel = getSportSelection();
        let rows = await P.cargarHorarios({ instructor_id: uid });
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[H.deporte]), sel));
        }
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${
                sel && !sel.all
                    ? "No tienes grupos de este deporte. Prueba «Todos» u otro filtro."
                    : "Aún no tienes grupos asignados. Contacta a bienestar deportivo."
            }</td></tr>`;
            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(P.formatCell(row[H.deporte]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.lugar]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.nivel]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.day]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.hour]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.capacity]))}</td>
            `;
            tbody.appendChild(tr);
        });
        if (window.DT) window.DT.initTable("#dt-prof-clases", { order: [[3, "asc"]] });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

function filterRowsByBloque(rows, bloque) {
    return rows.filter((row) => bloqueReserva(row.reservation_id) === Number(bloque));
}

async function loadAlumnos() {
    const container = document.getElementById("prof-lista-alumnos");
    if (!container) return;
    const uid = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarAsistenciaProfesor(uid);
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "No hay estudiantes inscritos en tus grupos todavía.", false);
            return;
        }

        let filtered = filterRowsByBloque(rows, profSessionFilter);
        if (filtered.length === 0) {
            P.renderEmpty(
                container,
                "No hay estudiantes en este bloque. Prueba otro bloque o espera nuevas inscripciones.",
                false
            );
            return;
        }

        const sel = getSportSelection();
        if (sel && !sel.all && SF) {
            filtered = filtered.filter((row) => {
                const d = row.deporte ?? row[R.deporte] ?? "";
                return SF.matchesSelection(P.formatCell(d), sel);
            });
        }
        if (filtered.length === 0) {
            P.renderEmpty(
                container,
                "No hay registros de este deporte en el bloque actual. Cambia el filtro de deporte o el bloque de sesiones.",
                false
            );
            return;
        }

        const bySport = {};
        filtered.forEach((row) => {
            const d = row.deporte ?? row[R.deporte] ?? "—";
            if (!bySport[d]) bySport[d] = [];
            bySport[d].push(row);
        });

        Object.keys(bySport)
            .sort((a, b) => a.localeCompare(b))
            .forEach((sport) => {
                const inner = document.createElement("div");
                const table = document.createElement("table");
                table.className = "data-table";
                table.innerHTML = `
                    <thead><tr>
                        <th>Estudiante</th>
                        <th>Horario</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr></thead>
                    <tbody></tbody>`;
                const tb = table.querySelector("tbody");
                bySport[sport].forEach((row) => {
                    const rid = row.reservation_id;
                    const nombre = row.estudiante_nombre ?? row[R.nombre];
                    const day = row.day ?? row[R.day];
                    const hour = row.hour ?? row[R.hour];
                    const st = row.attendance_status || null;
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${P.escapeHtml(P.formatCell(nombre))}</td>
                        <td>${P.escapeHtml(P.formatCell(day))} · ${P.escapeHtml(P.formatCell(hour))}</td>
                        <td>${badgeAsistencia(st)}</td>
                        <td>
                            <button type="button" class="btn btn--primary btn--sm" data-att-rid="${rid}" data-att-st="PRESENT">Presente</button>
                            <button type="button" class="btn btn--danger btn--sm" data-att-rid="${rid}" data-att-st="ABSENT">Ausente</button>
                        </td>
                    `;
                    tb.appendChild(tr);
                });
                inner.appendChild(table);
                const acc = U.accordionSection({
                    title: sport,
                    contentEl: inner,
                });
                container.appendChild(acc);
            });

        container.querySelectorAll("[data-att-rid]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const reservationId = parseInt(btn.getAttribute("data-att-rid"), 10);
                const status = btn.getAttribute("data-att-st");
                btn.disabled = true;
                try {
                    await P.registrarAsistencia({
                        reservation_id: reservationId,
                        instructor_user_id: uid,
                        status,
                    });
                    P.showFlash("Asistencia registrada.", "ok");
                    await loadAlumnos();
                } catch (e) {
                    P.showFlash(e.message || "No se pudo guardar.", "err");
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar los datos.", true);
    }
}

function parseScore(val) {
    if (val === "" || val == null) return null;
    const x = parseFloat(String(val).replace(",", "."));
    return Number.isFinite(x) ? x : null;
}

async function loadCalificacionesForms() {
    const container = document.getElementById("prof-lista-calificaciones");
    if (!container) return;
    const uid = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const sel = getSportSelection();
        let rows = await P.cargarCalificacionesProfesor(uid);
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(String(row.deporte || ""), sel));
        }
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(
                container,
                sel && !sel.all
                    ? "No hay evaluaciones para este deporte. Cambia el filtro o revisa otro grupo."
                    : "No hay grupos con estudiantes para evaluar.",
                false
            );
            return;
        }

        const bySport = {};
        rows.forEach((row) => {
            const d = row.deporte || "—";
            if (!bySport[d]) bySport[d] = [];
            bySport[d].push(row);
        });

        Object.keys(bySport)
            .sort((a, b) => a.localeCompare(b))
            .forEach((sport) => {
                const block = document.createElement("div");
                block.className = "sport-group";

                const inner = document.createElement("div");
                bySport[sport].forEach((row) => {
                    const rid = row.reservation_id;
                    const notaVal =
                        row.score !== null && row.score !== undefined && row.score !== ""
                            ? String(row.score)
                            : "";
                    const comVal = row.comment ? String(row.comment) : "";
                    const card = document.createElement("article");
                    card.className = "card card--calif-form";
                    card.innerHTML = `
                        <p class="card__label">Participante</p>
                        <h3 class="card__title">${P.escapeHtml(P.formatCell(row.estudiante_nombre))}</h3>
                        <p class="card__meta">${P.escapeHtml(P.formatCell(row.day))} · ${P.escapeHtml(
                        P.formatCell(row.hour)
                    )}</p>
                        <form class="form-calif" data-reservation-id="${rid}">
                            <div class="calif-session-grid">
                                <label>Bloque 1<input type="number" step="0.01" min="0" class="input-calif" name="s1" value="${P.escapeHtml(
                                    notaVal
                                )}" placeholder="0-5"></label>
                                <label>Bloque 2<input type="number" step="0.01" min="0" class="input-calif" name="s2" value="" placeholder="opcional"></label>
                                <label>Bloque 3<input type="number" step="0.01" min="0" class="input-calif" name="s3" value="" placeholder="opcional"></label>
                            </div>
                            <p class="calif-promedio-hint">Se guardará el promedio de los bloques con valor.</p>
                            <label class="field-label">Comentario</label>
                            <textarea class="textarea-calif" name="comment" rows="2" placeholder="Observaciones">${P.escapeHtml(
                                comVal
                            )}</textarea>
                            <button type="submit" class="btn btn--primary">Guardar evaluación</button>
                        </form>
                    `;
                    inner.appendChild(card);
                });

                const acc = U.accordionSection({
                    title: sport,
                    contentEl: inner,
                });
                container.appendChild(acc);
            });

        container.querySelectorAll("form.form-calif").forEach((form) => {
            form.addEventListener("submit", async (ev) => {
                ev.preventDefault();
                const reservationId = parseInt(form.getAttribute("data-reservation-id"), 10);
                const fd = new FormData(form);
                const s1 = parseScore(fd.get("s1"));
                const s2 = parseScore(fd.get("s2"));
                const s3 = parseScore(fd.get("s3"));
                const parts = [s1, s2, s3].filter((x) => x != null);
                const rating =
                    parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : NaN;
                if (!Number.isFinite(rating)) {
                    P.showFlash("Indica al menos una nota en los bloques.", "err");
                    return;
                }
                const comment = (fd.get("comment") || "").toString();
                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = true;
                try {
                    await P.guardarCalificacion({
                        reservation_id: reservationId,
                        rating,
                        comment: comment || null,
                        instructor_user_id: uid,
                    });
                    P.showFlash("Evaluación guardada (promedio de bloques).", "ok");
                } catch (e) {
                    P.showFlash(e.message || "Error al guardar", "err");
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar los datos.", true);
    }
}

function initSessionBar() {
    const bar = document.getElementById("prof-session-bar");
    if (!bar) return;
    bar.querySelectorAll(".session-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            profSessionFilter = parseInt(chip.getAttribute("data-ses"), 10);
            bar.querySelectorAll(".session-chip").forEach((c) => c.classList.toggle("is-active", c === chip));
            loadAlumnos();
        });
    });
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
            if (tab === "clases") loadMisClasesTabla();
            if (tab === "alumnos") loadAlumnos();
            if (tab === "calificaciones") loadCalificacionesForms();
        });
    });
}

function refreshActiveProfForSport() {
    const tab = document.querySelector(".tabs__btn.is-active")?.getAttribute("data-tab");
    if (tab === "clases") loadMisClasesTabla();
    if (tab === "alumnos") loadAlumnos();
    if (tab === "calificaciones") loadCalificacionesForms();
}

async function initSportRail() {
    const mount = document.getElementById("prof-sport-rail-mount");
    if (!mount || !SF) return;
    try {
        const sports = await P.cargarSports();
        SF.mountSportRail(mount, sports, {
            storageKey: STORAGE_SPORT,
            onChange: () => refreshActiveProfForSport(),
        });
    } catch (e) {
        mount.innerHTML = "";
    }
}

function init() {
    if (!P.requireRole(P.ROLE.profesor)) return;

    P.setHeaderName();
    document.getElementById("btn-logout")?.addEventListener("click", P.logout);

    initSessionBar();
    initTabs();
    initSportRail();
    P.pingApi();
    loadMisClasesTabla();
}

document.addEventListener("DOMContentLoaded", init);
