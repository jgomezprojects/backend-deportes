/**
 * Panel profesor — mis clases, alumnos, calificaciones.
 * Depende de panel-utils.js (AppPanel).
 */

const P = window.AppPanel;
const H = P.H;
const R = P.R;

async function loadMisClasesTabla() {
    const tbody = document.getElementById("prof-tabla-clases-body");
    if (!tbody) return;
    const uid = P.getUserId();
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Cargando…</td></tr>';

    try {
        const rows = await P.cargarHorarios({ instructor_id: uid });
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="empty-state">No tienes clases asignadas. Un administrador debe asignarte en cada horario.</td></tr>';
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
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadAlumnos() {
    const container = document.getElementById("prof-lista-alumnos");
    if (!container) return;
    const uid = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarReservasPorInstructor(uid);
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "No hay alumnos inscritos en tus clases todavía.", false);
            return;
        }

        rows.forEach((row) => {
            const item = document.createElement("div");
            item.className = "reserva-item";
            item.innerHTML = `
                <div>
                    <div class="reserva-item__main">${P.escapeHtml(P.formatCell(row[R.nombre]))}</div>
                    <div class="reserva-item__meta">${P.escapeHtml(P.formatCell(row[R.deporte]))}</div>
                    <div class="reserva-item__meta">${P.escapeHtml(P.formatCell(row[R.day]))} · ${P.escapeHtml(P.formatCell(row[R.hour]))}</div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar los alumnos.", true);
    }
}

async function loadCalificacionesForms() {
    const container = document.getElementById("prof-lista-calificaciones");
    if (!container) return;
    const uid = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarCalificacionesProfesor(uid);
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "No hay reservas en tus clases para calificar.", false);
            return;
        }

        rows.forEach((row) => {
            const rid = row.reservation_id;
            const notaVal =
                row.score !== null && row.score !== undefined && row.score !== ""
                    ? String(row.score)
                    : "";
            const comVal = row.comment ? String(row.comment) : "";
            const card = document.createElement("article");
            card.className = "card card--calif-form";
            card.innerHTML = `
                <p class="card__label">${P.escapeHtml(P.formatCell(row.deporte))}</p>
                <h3 class="card__title">${P.escapeHtml(P.formatCell(row.estudiante_nombre))}</h3>
                <p class="card__meta">${P.escapeHtml(P.formatCell(row.day))} · ${P.escapeHtml(P.formatCell(row.hour))}</p>
                <form class="form-calif" data-reservation-id="${rid}">
                    <label class="field-label">Nota</label>
                    <input type="number" step="0.01" min="0" class="input-calif" name="rating" value="${P.escapeHtml(notaVal)}" required>
                    <label class="field-label">Comentario</label>
                    <textarea class="textarea-calif" name="comment" rows="2" placeholder="Observaciones">${P.escapeHtml(comVal)}</textarea>
                    <button type="submit" class="btn btn--primary">Guardar</button>
                </form>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll("form.form-calif").forEach((form) => {
            form.addEventListener("submit", async (ev) => {
                ev.preventDefault();
                const reservationId = parseInt(form.getAttribute("data-reservation-id"), 10);
                const fd = new FormData(form);
                const rating = parseFloat(String(fd.get("rating")), 10);
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
                    P.showFlash("Calificación guardada.", "ok");
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

function init() {
    if (!P.requireRole(P.ROLE.profesor)) return;

    P.setHeaderName();
    document.getElementById("btn-logout")?.addEventListener("click", P.logout);

    initTabs();
    P.pingApi();
    loadMisClasesTabla();
}

document.addEventListener("DOMContentLoaded", init);
