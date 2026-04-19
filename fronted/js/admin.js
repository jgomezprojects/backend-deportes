/**
 * Panel administrador — usuarios, horarios, reservas, resumen.
 * Depende de panel-utils.js (AppPanel).
 */

const P = window.AppPanel;
const H = P.H;
const R = P.R;

let scheduleCatalog = {
    sports: [],
    locations: [],
    levels: [],
    profesores: [],
};

function toOptions(items, idKey, labelKey, includeEmpty) {
    const base = includeEmpty ? ['<option value="">Sin asignar</option>'] : [];
    return base
        .concat(
            items.map(
                (item) =>
                    `<option value="${item[idKey]}">${P.escapeHtml(P.formatCell(item[labelKey]))}</option>`
            )
        )
        .join("");
}

async function loadScheduleCatalog() {
    const sportSel = document.getElementById("admin-sport-id");
    const locSel = document.getElementById("admin-location-id");
    const levelSel = document.getElementById("admin-level-id");
    const profSel = document.getElementById("admin-instructor-id");
    if (!sportSel || !locSel || !levelSel || !profSel) return;

    const [sports, locations, levels, profesores] = await Promise.all([
        P.cargarSports(),
        P.cargarLocations(),
        P.cargarSportLevels(),
        P.cargarProfesores(),
    ]);
    scheduleCatalog = { sports, locations, levels, profesores };

    sportSel.innerHTML = toOptions(sports, "id", "name", false);
    locSel.innerHTML = toOptions(locations, "id", "name", false);
    levelSel.innerHTML = toOptions(levels, "id", "level", false);
    profSel.innerHTML = toOptions(profesores, "id", "nombre", true);
}

async function createScheduleFromForm(ev) {
    ev.preventDefault();
    const submitBtn = document.getElementById("admin-btn-create-schedule");
    const sportId = Number(document.getElementById("admin-sport-id").value);
    const locationId = Number(document.getElementById("admin-location-id").value);
    const levelId = Number(document.getElementById("admin-level-id").value);
    const instructorRaw = document.getElementById("admin-instructor-id").value;
    const day = document.getElementById("admin-day").value.trim();
    const hour = document.getElementById("admin-hour").value.trim();
    const capacity = Number(document.getElementById("admin-capacity").value);

    if (!sportId || !locationId || !levelId || !day || !hour || !capacity) {
        P.showFlash("Completa todos los campos obligatorios para crear el horario.", "err");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creando...";
    try {
        await P.crearHorario({
            sport_id: sportId,
            location_id: locationId,
            level_id: levelId,
            day,
            hour,
            capacity,
            instructor_id: instructorRaw === "" ? null : Number(instructorRaw),
        });
        P.showFlash("Horario creado correctamente.", "ok");
        ev.target.reset();
        document.getElementById("admin-capacity").value = "20";
        document.getElementById("admin-instructor-id").innerHTML = toOptions(
            scheduleCatalog.profesores,
            "id",
            "nombre",
            true
        );
        await loadHorariosTabla();
    } catch (e) {
        P.showFlash(e.message || "No se pudo crear el horario.", "err");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Crear horario";
    }
}

async function loadUsuarios() {
    const tbody = document.getElementById("admin-tabla-usuarios-body");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Cargando…</td></tr>';

    try {
        const rows = await P.cargarUsuariosList();
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No hay usuarios.</td></tr>';
            return;
        }

        rows.forEach((u) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(String(u.id))}</td>
                <td>${P.escapeHtml(P.formatCell(u.nombre))}</td>
                <td>${P.escapeHtml(P.labelRol(u.role_id))}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="3" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadHorariosTabla() {
    const tbody = document.getElementById("admin-tabla-horarios-body");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando…</td></tr>';

    try {
        const [rows, profesores] = await Promise.all([P.cargarHorarios(), P.cargarProfesores()]);
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin horarios registrados.</td></tr>';
            return;
        }

        rows.forEach((row) => {
            const sid = row[H.id];
            const current = row[H.instructor_id];
            const opts = ['<option value="">Sin asignar</option>']
                .concat(
                    profesores.map((p) => {
                        const sel = Number(current) === Number(p.id) ? " selected" : "";
                        return `<option value="${p.id}"${sel}>${P.escapeHtml(P.formatCell(p.nombre))}</option>`;
                    })
                )
                .join("");

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(P.formatCell(row[H.deporte]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.lugar]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.nivel]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.day]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.hour]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[H.capacity]))}</td>
                <td><select class="select-instructor" data-schedule-id="${sid}" aria-label="Profesor del horario">${opts}</select></td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll("select.select-instructor").forEach((sel) => {
            sel.addEventListener("change", async () => {
                const scheduleId = parseInt(sel.getAttribute("data-schedule-id"), 10);
                const val = sel.value;
                sel.disabled = true;
                try {
                    await P.patchScheduleInstructor(scheduleId, val === "" ? null : val);
                    P.showFlash("Profesor actualizado.", "ok");
                } catch (e) {
                    P.showFlash(e.message || "Error al guardar", "err");
                    await loadHorariosTabla();
                } finally {
                    sel.disabled = false;
                }
            });
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadReservasTabla() {
    const tbody = document.getElementById("admin-tabla-reservas-body");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Cargando…</td></tr>';

    try {
        const rows = await P.cargarReservasTodas();
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay reservas.</td></tr>';
            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(P.formatCell(row[R.nombre]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.deporte]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.day]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.hour]))}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadResumenSistema() {
    const container = document.getElementById("admin-resumen");
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
        const [usuarios, horarios, reservas] = await Promise.all([
            P.cargarUsuariosList(),
            P.cargarHorarios(),
            P.cargarReservasTodas(),
        ]);
        container.innerHTML = "";

        const stats = [
            { titulo: "Usuarios", valor: usuarios.length, desc: "Cuentas en la tabla usuarios" },
            { titulo: "Horarios", valor: horarios.length, desc: "Clases programadas" },
            { titulo: "Reservas", valor: reservas.length, desc: "Inscripciones activas" },
        ];

        stats.forEach((s) => {
            const card = document.createElement("article");
            card.className = "card card--stat";
            card.innerHTML = `
                <p class="card__label">${P.escapeHtml(s.titulo)}</p>
                <p class="card__stat-num">${s.valor}</p>
                <p class="card__meta">${P.escapeHtml(s.desc)}</p>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudo cargar el resumen.", true);
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
            if (tab === "usuarios") loadUsuarios();
            if (tab === "horarios") {
                loadScheduleCatalog().catch((e) => {
                    P.showFlash(e.message || "No se pudo cargar catálogo para horarios.", "err");
                });
                loadHorariosTabla();
            }
            if (tab === "reservas") loadReservasTabla();
            if (tab === "sistema") loadResumenSistema();
        });
    });
}

function init() {
    if (!P.requireRole(P.ROLE.admin)) return;

    P.setHeaderName();
    document.getElementById("btn-logout")?.addEventListener("click", P.logout);
    document
        .getElementById("admin-create-schedule-form")
        ?.addEventListener("submit", createScheduleFromForm);

    initTabs();
    P.pingApi();
    loadUsuarios();
    loadScheduleCatalog().catch((e) => {
        P.showFlash(e.message || "No se pudo cargar catálogo para crear horarios.", "err");
    });
}

document.addEventListener("DOMContentLoaded", init);
