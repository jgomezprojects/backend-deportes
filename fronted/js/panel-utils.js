/**
 * Utilidades compartidas entre paneles (estudiante, profesor, admin).
 */
(function (global) {
    const API_BASE = "http://127.0.0.1:8000";

    /** Índices filas GET /horarios (tuplas JSON) */
    const H = {
        id: 0,
        deporte: 1,
        lugar: 2,
        nivel: 3,
        day: 4,
        hour: 5,
        capacity: 6,
        instructor_id: 7,
        instructor_nombre: 8,
    };

    /** Índices filas GET /reservas */
    const R = {
        id: 0,
        nombre: 1,
        deporte: 2,
        day: 3,
        hour: 4,
        schedule_id: 5,
        instructor_nombre: 6,
    };

    const ROLE = {
        estudiante: 1,
        profesor: 2,
        admin: 3,
    };

    function getUserId() {
        const raw = localStorage.getItem("user_id");
        return raw ? parseInt(raw, 10) : NaN;
    }

    function formatCell(value) {
        if (value === null || value === undefined) return "—";
        if (typeof value === "object" && value !== null && typeof value.toString === "function") {
            return String(value);
        }
        return String(value);
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    async function fetchJson(url, options) {
        const res = await fetch(url, options);
        return res.json();
    }

    function showFlash(message, type) {
        const el = document.getElementById("flash-msg");
        if (!el) return;
        el.textContent = message;
        el.hidden = false;
        el.className = "flash " + (type === "ok" ? "flash--ok" : "flash--err");
        clearTimeout(showFlash._t);
        showFlash._t = setTimeout(() => {
            el.hidden = true;
        }, 5000);
    }

    function hideFlash() {
        const el = document.getElementById("flash-msg");
        if (el) {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function setHeaderName() {
        const nameEl = document.getElementById("user-display-name");
        const stored = localStorage.getItem("nombre");
        if (nameEl) {
            nameEl.textContent = stored && stored.trim() ? stored.trim() : "—";
        }
    }

    function logout() {
        localStorage.removeItem("user_id");
        localStorage.removeItem("rol");
        localStorage.removeItem("role_id");
        localStorage.removeItem("nombre");
        window.location.href = "login.html";
    }

    /**
     * @param {number} expectedRole - 1 estudiante, 2 profesor, 3 admin
     */
    function requireRole(expectedRole) {
        const uid = getUserId();
        if (!uid || Number.isNaN(uid)) {
            window.location.href = "login.html";
            return null;
        }
        const rol =
            localStorage.getItem("role_id") || localStorage.getItem("rol");
        if (rol !== String(expectedRole)) {
            alert("No tienes permiso para acceder a esta sección.");
            window.location.href = "login.html";
            return null;
        }
        return uid;
    }

    function renderEmpty(container, message, isError) {
        container.innerHTML = "";
        const div = document.createElement("div");
        div.className = isError ? "error-state" : "empty-state";
        div.textContent = message;
        container.appendChild(div);
    }

    async function cargarHorarios(opts) {
        let url = `${API_BASE}/horarios`;
        if (opts && opts.instructor_id != null && opts.instructor_id !== "") {
            url += `?instructor_id=${encodeURIComponent(opts.instructor_id)}`;
        }
        const data = await fetchJson(url);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarReservasUsuario(userId) {
        const data = await fetchJson(`${API_BASE}/reservas?user_id=${encodeURIComponent(userId)}`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarReservasPorInstructor(instructorId) {
        const data = await fetchJson(
            `${API_BASE}/reservas?instructor_id=${encodeURIComponent(instructorId)}`
        );
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarReservasTodas() {
        const data = await fetchJson(`${API_BASE}/reservas`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarUsuariosList() {
        const data = await fetchJson(`${API_BASE}/usuarios/list`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarProfesores() {
        const data = await fetchJson(`${API_BASE}/profesores`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarSports() {
        const data = await fetchJson(`${API_BASE}/sports`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarLocations() {
        const data = await fetchJson(`${API_BASE}/locations`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function cargarSportLevels() {
        const data = await fetchJson(`${API_BASE}/sport-levels`);
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function crearHorario(payload) {
        const data = await fetchJson(`${API_BASE}/schedules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    }

    /** Notas del estudiante (JSON desde API) */
    async function cargarCalificacionesAlumno(userId) {
        const data = await fetchJson(
            `${API_BASE}/calificaciones?user_id=${encodeURIComponent(userId)}`
        );
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    /** Lista para profesor: reservas con campos de nota */
    async function cargarCalificacionesProfesor(instructorId) {
        const data = await fetchJson(
            `${API_BASE}/calificaciones?instructor_id=${encodeURIComponent(instructorId)}`
        );
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (!Array.isArray(data)) {
            throw new Error("Respuesta inesperada del servidor");
        }
        return data;
    }

    async function guardarCalificacion(payload) {
        const data = await fetchJson(`${API_BASE}/calificaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    }

    async function patchScheduleInstructor(scheduleId, instructorId) {
        const data = await fetchJson(`${API_BASE}/schedules/${scheduleId}/instructor`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instructor_id:
                    instructorId === "" || instructorId === null || instructorId === undefined
                        ? null
                        : Number(instructorId),
            }),
        });
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    }

    async function pingApi() {
        const statusEl = document.getElementById("api-status");
        try {
            const data = await fetchJson(`${API_BASE}/`);
            if (statusEl) {
                statusEl.textContent = data.mensaje || "OK";
            }
        } catch {
            if (statusEl) {
                statusEl.textContent = "Sin conexión — revisa que el backend esté en marcha";
            }
        }
    }

    function labelRol(roleId) {
        const n = Number(roleId);
        if (n === 1) return "Estudiante";
        if (n === 2) return "Profesor";
        if (n === 3) return "Administrador";
        return "—";
    }

    global.AppPanel = {
        API_BASE,
        H,
        R,
        ROLE,
        getUserId,
        formatCell,
        escapeHtml,
        fetchJson,
        showFlash,
        hideFlash,
        setHeaderName,
        logout,
        requireRole,
        renderEmpty,
        cargarHorarios,
        cargarReservasUsuario,
        cargarReservasPorInstructor,
        cargarReservasTodas,
        cargarUsuariosList,
        cargarProfesores,
        cargarSports,
        cargarLocations,
        cargarSportLevels,
        crearHorario,
        cargarCalificacionesAlumno,
        cargarCalificacionesProfesor,
        guardarCalificacion,
        patchScheduleInstructor,
        pingApi,
        labelRol,
    };
})(window);
