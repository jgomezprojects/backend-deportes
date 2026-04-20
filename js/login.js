const API_BASE = "http://127.0.0.1:8000";
const statusEl = document.getElementById("login-status");
const submitBtn = document.getElementById("btn-login");

function getSelectedRoleId() {
    const el = document.querySelector('input[name="role"]:checked');
    return el ? parseInt(el.value, 10) : 1;
}

function showStatus(message, type) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = `form-status form-status--${type}`;
}

function hideStatus() {
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.className = "form-status";
}

async function login() {
    hideStatus();
    const nombre = document.getElementById("nombre").value.trim();
    const password = document.getElementById("password").value;
    const role_id = getSelectedRoleId();

    if (!nombre) {
        showStatus("Escribe tu usuario.", "error");
        return;
    }
    if (!password) {
        showStatus("Escribe tu contraseña.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Ingresando...";
    showStatus("Validando credenciales...", "info");

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ nombre, password, role_id }),
        });

        const data = await res.json();

        if (data.error) {
            showStatus(data.error, "error");
            return;
        }

        localStorage.setItem("user_id", String(data.id));
        localStorage.setItem("rol", String(data.role_id));
        localStorage.setItem("role_id", String(data.role_id));
        // Nombre para el saludo: prioridad API; si no viene, el usuario escrito en el login
        const displayName =
            data.nombre && String(data.nombre).trim()
                ? String(data.nombre).trim()
                : nombre;
        localStorage.setItem("nombre", displayName);
        showStatus("Ingreso exitoso. Redirigiendo...", "ok");

        setTimeout(() => {
            if (data.role_id === 1) {
                window.location.href = "estudiante.html";
            } else if (data.role_id === 2) {
                window.location.href = "profesor.html";
            } else if (data.role_id === 3) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "estudiante.html";
            }
        }, 600);
    } catch (err) {
        showStatus(
            "No se pudo conectar con el backend. Verifica que FastAPI esté ejecutándose en http://127.0.0.1:8000.",
            "error"
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Ingresar";
    }
}

document.getElementById("btn-login").addEventListener("click", login);
