/**
 * Web Component: Auth Form
 * Componente reutilizable para formularios de login/registro
 */
class AuthForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const type = this.getAttribute('type') || 'login';
        const title = this.getAttribute('title') || (type === 'login' ? 'Iniciar sesión' : 'Crear cuenta');
        const subtitle = this.getAttribute('subtitle') || 'Deportes universidad';
        const showRoles = this.getAttribute('show-roles') !== 'false';
        const showCareer = this.getAttribute('show-career') === 'true';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .auth-form {
                    background: white;
                    border-radius: 0.75rem;
                    padding: 2rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    max-width: 400px;
                    margin: 0 auto;
                }
                .auth-form h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                    color: var(--color-gray-900, #111827);
                    text-align: center;
                }
                .auth-form h2 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0 0 2rem 0;
                    color: var(--color-gray-700, #374151);
                    text-align: center;
                }
                .field-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-gray-700, #374151);
                    margin-bottom: 0.5rem;
                }
                .field-input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    margin-bottom: 1rem;
                }
                .field-input:focus {
                    outline: none;
                    border-color: var(--color-primary, #2563eb);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .role-fieldset {
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    border-radius: 0.375rem;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                }
                .role-fieldset legend {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-gray-700, #374151);
                    padding: 0 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .role-option {
                    display: block;
                    cursor: pointer;
                    padding: 0.25rem 0;
                    font-size: 0.875rem;
                    color: var(--color-gray-700, #374151);
                }
                .role-option input {
                    margin-right: 0.5rem;
                }
                .career-field {
                    margin-bottom: 1.5rem;
                }
                .form-actions {
                    margin-bottom: 1rem;
                }
                .form-status {
                    font-size: 0.875rem;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    margin-bottom: 1rem;
                    text-align: center;
                }
                .form-status--error {
                    background: var(--color-red-50, #fef2f2);
                    color: var(--color-red-700, #b91c1c);
                    border: 1px solid var(--color-red-200, #fecaca);
                }
                .form-status--success {
                    background: var(--color-green-50, #f0fdf4);
                    color: var(--color-green-700, #15803d);
                    border: 1px solid var(--color-green-200, #bbf7d0);
                }
                .form-status--info {
                    background: var(--color-blue-50, #eff6ff);
                    color: var(--color-blue-700, #1d4ed8);
                    border: 1px solid var(--color-blue-200, #dbeafe);
                }
                .form-links {
                    text-align: center;
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                }
                .form-links a {
                    color: var(--color-primary, #2563eb);
                    text-decoration: none;
                }
                .form-links a:hover {
                    text-decoration: underline;
                }
            </style>
            <div class="auth-form">
                <h1>${subtitle}</h1>
                <h2>${title}</h2>
                
                <label class="field-label" for="nombre">Usuario</label>
                <input id="nombre" class="field-input" type="text" placeholder="Tu nombre de usuario" autocomplete="username">
                
                ${type === 'register' ? `
                    <label class="field-label" for="email">Correo</label>
                    <input id="email" class="field-input" type="text" placeholder="correo@ejemplo.com" autocomplete="email">
                ` : ''}
                
                <label class="field-label" for="password">Contraseña</label>
                <input id="password" class="field-input" type="password" placeholder="Contraseña" autocomplete="${type === 'login' ? 'current-password' : 'new-password'}">
                
                ${showRoles ? `
                    <fieldset class="role-fieldset">
                        <legend>Rol</legend>
                        <label class="role-option">
                            <input type="radio" name="role" value="1" checked>
                            Estudiante
                        </label>
                        <label class="role-option">
                            <input type="radio" name="role" value="2">
                            Profesor
                        </label>
                        <label class="role-option">
                            <input type="radio" name="role" value="3">
                            Administrador
                        </label>
                    </fieldset>
                ` : ''}
                
                ${showCareer ? `
                    <div class="career-field">
                        <label class="field-label" for="career">Carrera</label>
                        <input id="career" class="field-input" type="text" placeholder="Ej: Ingeniería de Sistemas">
                    </div>
                ` : ''}
                
                <div class="form-actions">
                    <slot name="submit-button">
                        <app-button variant="primary" size="md" type="button" id="btn-submit">
                            ${type === 'login' ? 'Ingresar' : 'Registrarme'}
                        </app-button>
                    </slot>
                </div>
                
                <slot name="status">
                    <p id="form-status" class="form-status" hidden></p>
                </slot>
                
                <div class="form-links">
                    <slot name="links"></slot>
                </div>
            </div>
        `;

        // Event listeners
        const submitBtn = this.shadowRoot.querySelector('#btn-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('submit', { 
                    bubbles: true,
                    detail: this.getFormData()
                }));
            });
        }

        // Toggle career field based on role
        const roleInputs = this.shadowRoot.querySelectorAll('input[name="role"]');
        const careerField = this.shadowRoot.querySelector('.career-field');
        
        roleInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (careerField) {
                    const isStudent = input.value === '1';
                    careerField.style.display = isStudent ? 'block' : 'none';
                    const careerInput = careerField.querySelector('#career');
                    if (careerInput) {
                        careerInput.required = isStudent;
                        if (!isStudent) careerInput.value = '';
                    }
                }
                this.dispatchEvent(new CustomEvent('role-change', { 
                    bubbles: true,
                    detail: { role: input.value }
                }));
            });
        });
    }

    getFormData() {
        const data = {
            nombre: this.shadowRoot.querySelector('#nombre').value.trim(),
            password: this.shadowRoot.querySelector('#password').value,
            role: this.shadowRoot.querySelector('input[name="role"]:checked')?.value || '1'
        };

        const emailInput = this.shadowRoot.querySelector('#email');
        if (emailInput) {
            data.email = emailInput.value.trim() || null;
        }

        const careerInput = this.shadowRoot.querySelector('#career');
        if (careerInput) {
            data.career = careerInput.value.trim() || null;
        }

        return data;
    }

    showStatus(message, type = 'info') {
        const statusEl = this.shadowRoot.querySelector('#form-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `form-status form-status--${type}`;
            statusEl.hidden = false;
        }
    }

    hideStatus() {
        const statusEl = this.shadowRoot.querySelector('#form-status');
        if (statusEl) {
            statusEl.hidden = true;
            statusEl.textContent = '';
        }
    }

    setSubmitButtonState(loading = false, text = null) {
        const submitBtn = this.shadowRoot.querySelector('#btn-submit');
        if (submitBtn) {
            submitBtn.setAttribute('loading', loading.toString());
            if (text) {
                submitBtn.textContent = text;
            }
        }
    }

    reset() {
        this.shadowRoot.querySelector('#nombre').value = '';
        this.shadowRoot.querySelector('#password').value = '';
        
        const emailInput = this.shadowRoot.querySelector('#email');
        if (emailInput) emailInput.value = '';
        
        const careerInput = this.shadowRoot.querySelector('#career');
        if (careerInput) careerInput.value = '';
        
        this.hideStatus();
        this.setSubmitButtonState(false);
    }

    static get observedAttributes() {
        return ['type', 'title', 'subtitle', 'show-roles', 'show-career'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('auth-form', AuthForm);
