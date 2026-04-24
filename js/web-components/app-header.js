/**
 * Web Component: App Header
 * Componente reutilizable para el header de la aplicación
 */
class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const role = this.getAttribute('role') || 'estudiante';
        
        // Always use defaults from role, ignore manual attributes for consistency
        const logo = this.getDefaultLogo(role);
        const title = this.getDefaultTitle(role);
        const subtitle = this.getDefaultSubtitle(role);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .header {
                    background: var(--color-primary, #2563eb);
                    color: white;
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header--profesor {
                    background: var(--color-secondary, #059669);
                }
                .header--admin {
                    background: var(--color-danger, #dc2626);
                }
                .header__brand {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .header__logo {
                    font-size: 2rem;
                    font-weight: bold;
                }
                .header__title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                }
                .header__subtitle {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin: 0;
                }
                .header__user {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .header__welcome {
                    font-size: 0.875rem;
                }
                .btn {
                    background: transparent;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .btn:hover {
                    background: rgba(255,255,255,0.1);
                }
            </style>
            <header class="header header--${role}">
                <div class="header__brand">
                    <span class="header__logo" aria-hidden="true">${logo}</span>
                    <div>
                        <p class="header__title">${title}</p>
                        <p class="header__subtitle">${subtitle}</p>
                    </div>
                </div>
                <div class="header__user">
                    <span class="header__welcome">Hola <strong id="user-display-name">—</strong></span>
                    <button type="button" class="btn btn--ghost" id="btn-logout">Cerrar sesión</button>
                </div>
            </header>
        `;

        // Mantener la funcionalidad del botón logout
        this.shadowRoot.getElementById('btn-logout').addEventListener('click', () => {
            if (typeof window.AppPanel !== 'undefined' && window.AppPanel.logout) {
                window.AppPanel.logout();
            } else {
                // Fallback si AppPanel no está disponible
                localStorage.removeItem("user_id");
                localStorage.removeItem("rol");
                localStorage.removeItem("role_id");
                localStorage.removeItem("nombre");
                window.location.href = "login.html";
            }
        });

        // Sincronizar con el DOM principal para el user-display-name
        this.syncUserDisplay();
    }

    getDefaultLogo(role) {
        const logos = {
            estudiante: '◆',
            profesor: '◎',
            admin: '⚙'
        };
        return logos[role] || '◆';
    }

    getDefaultTitle(role) {
        const titles = {
            estudiante: 'Portal del estudiante',
            profesor: 'Espacio docente',
            admin: 'Administración'
        };
        return titles[role] || 'Portal';
    }

    getDefaultSubtitle(role) {
        const subtitles = {
            estudiante: 'Bienestar y deporte universitario',
            profesor: 'Seguimiento de grupos y evaluación',
            admin: 'Coordinación de actividad física y espacios'
        };
        return subtitles[role] || 'Sistema';
    }

    syncUserDisplay() {
        // Sincronizar el user-display-name con el DOM principal
        const shadowDisplay = this.shadowRoot.getElementById('user-display-name');
        const mainDisplay = document.getElementById('user-display-name');
        
        if (shadowDisplay && mainDisplay) {
            shadowDisplay.textContent = mainDisplay.textContent;
            
            // Observer para cambios futuros
            const observer = new MutationObserver(() => {
                shadowDisplay.textContent = mainDisplay.textContent;
            });
            
            observer.observe(mainDisplay, { childList: true, characterData: true });
        }
    }

    static get observedAttributes() {
        return ['role', 'logo', 'title', 'subtitle'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('app-header', AppHeader);
