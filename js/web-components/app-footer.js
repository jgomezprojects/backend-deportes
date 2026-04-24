/**
 * Web Component: App Footer
 * Componente reutilizable para el footer de la aplicación
 */
class AppFooter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const role = this.getAttribute('role');
        const text = this.getAttribute('text') || this.getDefaultText(role);
        const showApiStatus = this.getAttribute('show-api-status') !== 'false';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .footer {
                    background: var(--color-gray-100, #f8fafc);
                    padding: 1rem 2rem;
                    text-align: center;
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                    border-top: 1px solid var(--color-gray-200, #e2e8f0);
                }
                .footer p {
                    margin: 0;
                }
                .footer-ok {
                    color: var(--color-green-600, #059669);
                }
            </style>
            <footer class="footer footer--minimal">
                <p>${text}${showApiStatus ? ' · <span id="api-status">—</span>' : ''}</p>
            </footer>
        `;

        // Sincronizar api-status con el DOM principal
        if (showApiStatus) {
            this.syncApiStatus();
        }
    }

    getDefaultText(role) {
        const texts = {
            estudiante: 'Portal institucional de deportes',
            profesor: 'Portal docente',
            admin: 'Portal de administración'
        };
        return texts[role] || 'Portal institucional de deportes';
    }

    syncApiStatus() {
        // Sincronizar el api-status con el DOM principal
        const shadowStatus = this.shadowRoot.getElementById('api-status');
        const mainStatus = document.getElementById('api-status');
        
        if (shadowStatus && mainStatus) {
            shadowStatus.textContent = mainStatus.textContent;
            shadowStatus.className = mainStatus.className;
            
            // Observer para cambios futuros
            const observer = new MutationObserver(() => {
                shadowStatus.textContent = mainStatus.textContent;
                shadowStatus.className = mainStatus.className;
            });
            
            observer.observe(mainStatus, { 
                childList: true, 
                characterData: true, 
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Mantener funcionalidad de API status si existe
        if (typeof window.AppPanel !== 'undefined' && window.AppPanel.pingApi) {
            setTimeout(() => window.AppPanel.pingApi(), 100);
        }
    }

    static get observedAttributes() {
        return ['role', 'text', 'show-api-status'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('app-footer', AppFooter);
