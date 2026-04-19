/**
 * Panel estudiante — horarios, reservas, calificaciones (API).
 * Depende de panel-utils.js (AppPanel).
 */

const P = window.AppPanel;
const H = P.H;
const R = P.R;

function profLabel(row) {
    const n = row[H.instructor_nombre];
    return n && String(n).trim() ? String(n).trim() : "—";
}

async function inscribirse(scheduleId) {
    const userId = P.getUserId();
    if (!userId || Number.isNaN(userId)) {
        throw new Error("Sesión no válida");
    }
    const data = await P.fetchJson(`${P.API_BASE}/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: userId,
            schedule_id: scheduleId,
        }),
    });
    if (data.error) {
        throw new Error(data.error);
    }
    return data;
}

async function loadClasesDisponibles() {
    const container = document.getElementById("lista-clases");
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarHorarios();
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "No hay clases disponibles por ahora.", false);
            return;
        }

        rows.forEach((row) => {
            const sid = row[H.id];
            const card = document.createElement("article");
            card.className = "card";
            card.innerHTML = `
                <p class="card__label">Deporte</p>
                <h3 class="card__title">${P.escapeHtml(P.formatCell(row[H.deporte]))}</h3>
                <p class="card__meta"><strong>Nivel:</strong> ${P.escapeHtml(P.formatCell(row[H.nivel]))}</p>
                <p class="card__meta"><strong>Lugar:</strong> ${P.escapeHtml(P.formatCell(row[H.lugar]))}</p>
                <p class="card__meta"><strong>Día:</strong> ${P.escapeHtml(P.formatCell(row[H.day]))}</p>
                <p class="card__meta"><strong>Hora:</strong> ${P.escapeHtml(P.formatCell(row[H.hour]))}</p>
                <p class="card__meta"><strong>Profesor:</strong> ${P.escapeHtml(profLabel(row))}</p>
                <p class="card__meta"><strong>Cupos:</strong> ${P.escapeHtml(P.formatCell(row[H.capacity]))}</p>
                <div class="card__actions">
                    <button type="button" class="btn btn--primary" data-schedule-id="${sid}">Inscribirse</button>
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll("[data-schedule-id]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = parseInt(btn.getAttribute("data-schedule-id"), 10);
                btn.disabled = true;
                try {
                    await inscribirse(id);
                    P.showFlash("Inscripción realizada correctamente.", "ok");
                    await loadMisReservasIfMounted();
                } catch (e) {
                    P.showFlash(e.message || "Error al inscribirse", "err");
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar las clases.", true);
    }
}

async function loadMisReservasIfMounted() {
    const panel = document.getElementById("panel-reservas");
    if (panel && !panel.hidden) {
        await loadMisReservas();
    }
}

async function loadMisReservas() {
    const container = document.getElementById("lista-reservas");
    if (!container) return;
    const userId = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarReservasUsuario(userId);
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "Aún no tienes reservas. Explora «Clases disponibles».", false);
            return;
        }

        rows.forEach((row) => {
            const prof = row[R.instructor_nombre];
            const profTxt = prof && String(prof).trim() ? String(prof).trim() : "—";
            const item = document.createElement("div");
            item.className = "reserva-item";
            item.innerHTML = `
                <div>
                    <div class="reserva-item__main">${P.escapeHtml(P.formatCell(row[R.deporte]))}</div>
                    <div class="reserva-item__meta">${P.escapeHtml(P.formatCell(row[R.day]))} · ${P.escapeHtml(P.formatCell(row[R.hour]))}</div>
                    <div class="reserva-item__meta"><strong>Profesor:</strong> ${P.escapeHtml(profTxt)}</div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar tus reservas.", true);
    }
}

async function loadHorariosTabla() {
    const tbody = document.getElementById("tabla-horarios-body");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando…</td></tr>';

    try {
        const rows = await P.cargarHorarios();
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin horarios registrados.</td></tr>';
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
                <td>${P.escapeHtml(profLabel(row))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.capacity]))}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadMisNotas() {
    const container = document.getElementById("lista-notas");
    if (!container) return;
    const userId = P.getUserId();
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const rows = await P.cargarCalificacionesAlumno(userId);
        container.innerHTML = "";
        if (rows.length === 0) {
            P.renderEmpty(container, "No hay calificaciones aún o no tienes reservas.", false);
            return;
        }

        rows.forEach((row) => {
            const card = document.createElement("article");
            card.className = "card card--nota";
            const nota =
                row.score !== null && row.score !== undefined && row.score !== ""
                    ? P.formatCell(row.score)
                    : "Pendiente";
            card.innerHTML = `
                <p class="card__label">${P.escapeHtml(P.formatCell(row.deporte))}</p>
                <h3 class="card__title">${P.escapeHtml(P.formatCell(row.day))} · ${P.escapeHtml(P.formatCell(row.hour))}</h3>
                <p class="card__meta"><strong>Profesor:</strong> ${P.escapeHtml(P.formatCell(row.instructor_nombre))}</p>
                <p class="card__meta"><strong>Nota:</strong> ${P.escapeHtml(nota)}</p>
                <p class="card__meta"><strong>Comentario:</strong> ${P.escapeHtml(row.comment ? String(row.comment) : "—")}</p>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudieron cargar las notas.", true);
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
            if (tab === "horarios") loadHorariosTabla();
            if (tab === "notas") loadMisNotas();
        });
    });
}

function init() {
    if (!P.requireRole(P.ROLE.estudiante)) return;

    P.setHeaderName();
    document.getElementById("btn-logout")?.addEventListener("click", P.logout);

    initTabs();
    P.pingApi();
    loadClasesDisponibles();
}

document.addEventListener("DOMContentLoaded", init);
