/**
 * Panel administrador — DataTables, usuarios por rol, sin IDs visibles.
 */
const P = window.AppPanel;
const U = window.UIX;
const SF = window.SportFilter;
const H = P.H;
const R = P.R;

const STORAGE_ADMIN_SPORT = "sport_filter_admin";

function getAdminSportSelection() {
    if (!SF) return { all: true, sportId: null, sportName: null };
    return SF.readStored(STORAGE_ADMIN_SPORT) || { all: true, sportId: null, sportName: null };
}

let adminSportRailMounted = false;

let scheduleCatalog = {
    sports: [],
    locations: [],
    levels: [],
    profesores: [],
};

function buildHourRange(startTime, durationMinutes) {
    if (!startTime || !durationMinutes) return "";
    const parts = startTime.split(":");
    if (parts.length !== 2) return "";
    const startHour = Number(parts[0]);
    const startMinute = Number(parts[1]);
    if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return "";
    const startTotal = startHour * 60 + startMinute;
    const endTotal = startTotal + Number(durationMinutes);
    if (endTotal > 24 * 60) return "";
    const endHour = Math.floor(endTotal / 60);
    const endMinute = endTotal % 60;
    return `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}-${String(
        endHour
    ).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function refreshHourRangePreview() {
    const startInput = document.getElementById("admin-hour-start");
    const durationSel = document.getElementById("admin-duration-minutes");
    const rangeInput = document.getElementById("admin-hour-range");
    if (!startInput || !durationSel || !rangeInput) return;
    rangeInput.value = buildHourRange(startInput.value, durationSel.value);
}

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
    const hourStart = document.getElementById("admin-hour-start").value;
    const durationMinutes = Number(document.getElementById("admin-duration-minutes").value);
    const hour = buildHourRange(hourStart, durationMinutes);
    const capacity = Number(document.getElementById("admin-capacity").value);

    if (!sportId || !locationId || !levelId || !day || !hour || !capacity) {
        P.showFlash("Completa todos los campos obligatorios.", "err");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando…";
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
        P.showFlash("Horario publicado correctamente.", "ok");
        ev.target.reset();
        document.getElementById("admin-capacity").value = "20";
        document.getElementById("admin-duration-minutes").value = "90";
        document.getElementById("admin-instructor-id").innerHTML = toOptions(
            scheduleCatalog.profesores,
            "id",
            "nombre",
            true
        );
        refreshHourRangePreview();
        await loadHorariosTabla();
    } catch (e) {
        P.showFlash(e.message || "No se pudo crear el horario.", "err");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publicar horario";
    }
}

function initUsuariosTables() {
    ["#dt-admin-est", "#dt-admin-prof", "#dt-admin-adm"].forEach((sel) => {
        if (window.DT) window.DT.destroyIfAny(sel);
    });
}

async function loadUsuarios() {
    const tbEst = document.getElementById("admin-tb-est");
    const tbProf = document.getElementById("admin-tb-prof");
    const tbAdm = document.getElementById("admin-tb-adm");
    const kpi = document.getElementById("admin-kpi-usuarios");
    if (!tbEst || !tbProf || !tbAdm) return;

    initUsuariosTables();
    [tbEst, tbProf, tbAdm].forEach((t) => {
        t.innerHTML = '<tr><td colspan="2" class="empty-state">Cargando…</td></tr>';
    });

    try {
        const rows = await P.cargarUsuariosList();
        const est = rows.filter((u) => Number(u.role_id) === 1);
        const prof = rows.filter((u) => Number(u.role_id) === 2);
        const adm = rows.filter((u) => Number(u.role_id) === 3);

        if (kpi) {
            kpi.innerHTML = "";
            kpi.appendChild(
                U.statCard({
                    label: "Estudiantes",
                    value: est.length,
                    hint: "cuentas con perfil alumno",
                })
            );
            kpi.appendChild(
                U.statCard({
                    label: "Docentes",
                    value: prof.length,
                    hint: "cuentas con perfil docente",
                })
            );
            kpi.appendChild(
                U.statCard({
                    label: "Administradores",
                    value: adm.length,
                    hint: "cuentas de gestión",
                })
            );
        }

        function fillTb(tbody, list) {
            tbody.innerHTML = "";
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Sin registros.</td></tr>';
                return;
            }
            list.forEach((u) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${P.escapeHtml(P.formatCell(u.nombre))}</td>
                    <td><button type="button" class="btn btn--danger btn--sm js-del-user" data-user-id="${u.id}">Eliminar cuenta</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        fillTb(tbEst, est);
        fillTb(tbProf, prof);
        fillTb(tbAdm, adm);

        [tbEst, tbProf, tbAdm].forEach((tb) => {
            tb.querySelectorAll(".js-del-user").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const userId = Number(btn.getAttribute("data-user-id"));
                    if (!confirm("¿Eliminar esta cuenta y sus datos asociados?")) return;
                    btn.disabled = true;
                    try {
                        await P.eliminarUsuario(userId);
                        P.showFlash("Cuenta eliminada.", "ok");
                        await Promise.all([loadUsuarios(), loadHorariosTabla(), loadReservasTabla()]);
                    } catch (e) {
                        P.showFlash(e.message || "No se pudo eliminar.", "err");
                    } finally {
                        btn.disabled = false;
                    }
                });
            });
        });

        if (window.DT) {
            if (est.length) window.DT.initTable("#dt-admin-est", { order: [[0, "asc"]] });
            if (prof.length) window.DT.initTable("#dt-admin-prof", { order: [[0, "asc"]] });
            if (adm.length) window.DT.initTable("#dt-admin-adm", { order: [[0, "asc"]] });
        }
    } catch (e) {
        [tbEst, tbProf, tbAdm].forEach((t) => {
            t.innerHTML = `<tr><td colspan="2" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
        });
    }
}

async function loadHorariosTabla() {
    const tbody = document.getElementById("admin-tabla-horarios-body");
    if (!tbody) return;
    if (window.DT) window.DT.destroyIfAny("#dt-admin-horarios");
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Cargando…</td></tr>';

    try {
        const sel = getAdminSportSelection();
        let [rows, profesores] = await Promise.all([P.cargarHorarios(), P.cargarProfesores()]);
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[H.deporte]), sel));
        }
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${
                sel && !sel.all
                    ? "No hay franjas para este deporte. Prueba «Todos» u otro deporte."
                    : "No hay horarios publicados."
            }</td></tr>`;
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
                <td><select class="select-instructor" data-schedule-id="${sid}" aria-label="Docente asignado">${opts}</select></td>
                <td><button type="button" class="btn btn--danger btn--sm js-del-schedule" data-schedule-id="${sid}">Eliminar</button></td>
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
                    P.showFlash("Docente actualizado.", "ok");
                } catch (e) {
                    P.showFlash(e.message || "Error al guardar", "err");
                    await loadHorariosTabla();
                } finally {
                    sel.disabled = false;
                }
            });
        });
        tbody.querySelectorAll(".js-del-schedule").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const scheduleId = Number(btn.getAttribute("data-schedule-id"));
                if (!confirm("¿Eliminar este horario y sus inscripciones vinculadas?")) return;
                btn.disabled = true;
                try {
                    await P.eliminarHorario(scheduleId);
                    P.showFlash("Horario eliminado.", "ok");
                    await Promise.all([loadHorariosTabla(), loadReservasTabla()]);
                } catch (e) {
                    P.showFlash(e.message || "No se pudo eliminar.", "err");
                } finally {
                    btn.disabled = false;
                }
            });
        });

        if (window.DT) window.DT.initTable("#dt-admin-horarios", { order: [[0, "asc"]] });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

function formatHistorialNotas(row) {
    return row.notes != null && row.notes !== "" ? String(row.notes) : "—";
}

function formatHistorialFecha(row) {
    const d = row.date ?? row.event_date ?? row.created_at ?? row.created;
    return P.formatCell(d);
}

async function loadHistorialMatricula() {
    const tbody = document.getElementById("admin-tabla-historial-body");
    if (!tbody) return;
    if (window.DT) window.DT.destroyIfAny("#dt-admin-historial");
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando…</td></tr>';

    try {
        const sel = getAdminSportSelection();
        let rows = await P.cargarHistorialMatricula({ limit: 400 });
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => {
                const deporte = row.sport_name ?? P.formatCell(row.sport_id) ?? "";
                return SF.matchesSelection(String(deporte), sel);
            });
        }
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${
                sel && !sel.all
                    ? "No hay movimientos para este deporte con el filtro actual."
                    : "No hay movimientos registrados."
            }</td></tr>`;
            return;
        }

        rows.forEach((row) => {
            const estudiante = row.student_label ?? "—";
            const deporte = row.sport_name ?? P.formatCell(row.sport_id) ?? "—";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(formatHistorialFecha(row))}</td>
                <td>${P.escapeHtml(P.formatCell(estudiante))}</td>
                <td>${P.escapeHtml(P.formatCell(deporte))}</td>
                <td>${P.escapeHtml(
                    row.action != null && row.action !== "" ? String(row.action) : "—"
                )}</td>
                <td>${P.escapeHtml(formatHistorialNotas(row))}</td>
            `;
            tbody.appendChild(tr);
        });

        if (window.DT) window.DT.initTable("#dt-admin-historial", { order: [[0, "desc"]] });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
    }
}

async function loadReservasTabla() {
    const tbody = document.getElementById("admin-tabla-reservas-body");
    if (!tbody) return;
    if (window.DT) window.DT.destroyIfAny("#dt-admin-reservas");
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando…</td></tr>';

    try {
        const sel = getAdminSportSelection();
        let rows = await P.cargarReservasTodas();
        if (sel && !sel.all && SF) {
            rows = rows.filter((row) => SF.matchesSelection(P.formatCell(row[R.deporte]), sel));
        }
        tbody.innerHTML = "";
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${
                sel && !sel.all
                    ? "No hay inscripciones para este deporte. Cambia el filtro."
                    : "No hay inscripciones."
            }</td></tr>`;
            return;
        }

        const sorted = rows.slice().sort((a, b) => {
            const da = P.formatCell(a[R.deporte]);
            const db = P.formatCell(b[R.deporte]);
            return String(da).localeCompare(String(db));
        });

        sorted.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${P.escapeHtml(P.formatCell(row[R.deporte]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.nombre]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.day]))}</td>
                <td>${P.escapeHtml(P.formatCell(row[R.hour]))}</td>
                <td><button type="button" class="btn btn--danger btn--sm js-del-reserva" data-reserva-id="${row[R.id]}">Anular inscripción</button></td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".js-del-reserva").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const reservaId = Number(btn.getAttribute("data-reserva-id"));
                if (!confirm("¿Anular esta inscripción?")) return;
                btn.disabled = true;
                try {
                    await P.eliminarReserva(reservaId);
                    P.showFlash("Inscripción anulada.", "ok");
                    await loadReservasTabla();
                } catch (e) {
                    P.showFlash(e.message || "No se pudo anular.", "err");
                } finally {
                    btn.disabled = false;
                }
            });
        });

        if (window.DT) window.DT.initTable("#dt-admin-reservas", { order: [[0, "asc"]] });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="error-state">${P.escapeHtml(e.message)}</td></tr>`;
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
            {
                label: "Usuarios totales",
                value: usuarios.length,
                hint: "directorio completo del sistema",
            },
            { label: "Franjas publicadas", value: horarios.length, hint: "horarios activos en oferta" },
            {
                label: "Inscripciones vigentes",
                value: reservas.length,
                hint: "matrículas en actividades",
            },
        ];

        stats.forEach((s) => {
            container.appendChild(U.statCard(s));
        });
    } catch (e) {
        container.innerHTML = "";
        P.renderEmpty(container, e.message || "No se pudo cargar el resumen.", true);
    }
}

function setAdminSportRailVisible(tab) {
    const el = document.getElementById("admin-sport-rail-mount");
    if (!el) return;
    const show = ["horarios", "reservas", "historial"].includes(tab);
    el.hidden = !show;
}

async function initAdminSportRail() {
    const mount = document.getElementById("admin-sport-rail-mount");
    if (!mount || !SF || adminSportRailMounted) return;
    try {
        const sports = await P.cargarSports();
        SF.mountSportRail(mount, sports, {
            storageKey: STORAGE_ADMIN_SPORT,
            onChange: () => {
                const tab = document.querySelector(".tabs__btn.is-active")?.getAttribute("data-tab");
                if (tab === "horarios") loadHorariosTabla();
                if (tab === "reservas") loadReservasTabla();
                if (tab === "historial") loadHistorialMatricula();
            },
        });
        adminSportRailMounted = true;
    } catch (e) {
        mount.innerHTML = "";
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
            setAdminSportRailVisible(tab);
            P.hideFlash();
            if (tab === "usuarios") loadUsuarios();
            if (tab === "horarios") {
                loadScheduleCatalog().catch((e) => {
                    P.showFlash(e.message || "No se pudo cargar el catálogo.", "err");
                });
                loadHorariosTabla();
            }
            if (tab === "reservas") loadReservasTabla();
            if (tab === "historial") loadHistorialMatricula();
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
    document
        .getElementById("admin-hour-start")
        ?.addEventListener("input", refreshHourRangePreview);
    document
        .getElementById("admin-duration-minutes")
        ?.addEventListener("change", refreshHourRangePreview);

    // Conectar tabs con sections
    const tabs = document.querySelector('app-tabs');
    if (tabs) {
        tabs.addEventListener('tab-change', (e) => {
            const activeTab = e.detail.activeTab;
            
            // Actualizar app-sections
            document.querySelectorAll('app-section[panel-id]').forEach(section => {
                const panelId = section.getAttribute('panel-id');
                const isActive = panelId === activeTab;
                section.setActive(isActive);
            });
        });
    }

    // Inicializar tabs existente
    initTabs();
    setAdminSportRailVisible("usuarios");
    initAdminSportRail();
    P.pingApi();
    loadUsuarios();
    refreshHourRangePreview();
    loadScheduleCatalog().catch((e) => {
        P.showFlash(e.message || "No se pudo cargar el catálogo.", "err");
    });
}

document.addEventListener("DOMContentLoaded", init);
