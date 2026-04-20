const API_BASE = "https://backend-deportes-production-0925.up.railway.app";
const statusEl = document.getElementById("register-status");
const submitBtn = document.getElementById("btn-register");
const careerWrapEl = document.getElementById("career-wrap");
const careerInputEl = document.getElementById("career");

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

function toggleCareerField() {
    const roleId = getSelectedRoleId();
    const isStudent = roleId === 1;
    if (!careerWrapEl || !careerInputEl) return;
    careerWrapEl.style.display = isStudent ? "block" : "none";
    careerInputEl.required = isStudent;
    if (!isStudent) {
        careerInputEl.value = "";
    }
}

async function register() {
    hideStatus();
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role_id = getSelectedRoleId();
    const career = (careerInputEl?.value || "").trim();

    if (!nombre) {
        showStatus("Escribe un nombre de usuario.", "error");
        return;
    }
    if (!password) {
        showStatus("Escribe una contraseña.", "error");
        return;
    }
    if (password.length < 4) {
        showStatus("Usa una contraseña de al menos 4 caracteres.", "error");
        return;
    }
    if (role_id === 1 && !career) {
        showStatus("Si el rol es estudiante, debes indicar la carrera.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando...";
    showStatus("Enviando datos al servidor...", "info");

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nombre,
                email: email || null,
                password,
                role_id,
                career: role_id === 1 ? career : null,
            }),
        });

        const data = await res.json();
        if (data.error) {
            showStatus(`No se pudo registrar: ${data.error}`, "error");
            return;
        }

        showStatus(
            `Usuario creado (ID ${data.id}). Redirigiendo al login para probar acceso...`,
            "ok"
        );
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
    } catch (err) {
        showStatus(
            "No se pudo conectar con el backend. Verifica que FastAPI esté ejecutándose en http://127.0.0.1:8000.",
            "error"
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Registrarme";
    }
}

document.getElementById("btn-register").addEventListener("click", register);
document
    .querySelectorAll('input[name="role"]')
    .forEach((el) => el.addEventListener("change", toggleCareerField));
toggleCareerField();
