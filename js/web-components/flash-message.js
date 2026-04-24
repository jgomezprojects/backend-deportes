/**
 * Web Component: Flash Message
 * Componente reutilizable para mensajes flash/alertas
 */
class FlashMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._timeout = null;
    }

    connectedCallback() {
        const type = this.getAttribute('type') || 'info';
        const message = this.getAttribute('message') || '';
        const autoHide = this.getAttribute('auto-hide') !== 'false';
        const duration = parseInt(this.getAttribute('duration')) || 5000;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .flash {
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    animation: slideDown 0.3s ease-out;
                }
                .flash--ok {
                    background: var(--color-green-50, #f0fdf4);
                    color: var(--color-green-700, #15803d);
                    border: 1px solid var(--color-green-200, #bbf7d0);
                }
                .flash--err {
                    background: var(--color-red-50, #fef2f2);
                    color: var(--color-red-700, #b91c1c);
                    border: 1px solid var(--color-red-200, #fecaca);
                }
                .flash--info {
                    background: var(--color-blue-50, #eff6ff);
                    color: var(--color-blue-700, #1d4ed8);
                    border: 1px solid var(--color-blue-200, #dbeafe);
                }
                .flash--warning {
                    background: var(--color-yellow-50, #fefce8);
                    color: var(--color-yellow-700, #a16207);
                    border: 1px solid var(--color-yellow-200, #fef3c7);
                }
                .flash__icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }
                .flash__message {
                    flex: 1;
                }
                .flash__close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.25rem;
                    color: inherit;
                    opacity: 0.7;
                    padding: 0;
                    width: 1.5rem;
                    height: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0.25rem;
                    transition: opacity 0.2s;
                }
                .flash__close:hover {
                    opacity: 1;
                }
                .flash[hidden] {
                    display: none;
                }
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
            <div class="flash flash--${type}" ${!message ? 'hidden' : ''}>
                <span class="flash__icon">${this.getIcon(type)}</span>
                <span class="flash__message">${message}</span>
                <button type="button" class="flash__close" aria-label="Cerrar">×</button>
            </div>
        `;

        // Event listener para cerrar
        this.shadowRoot.querySelector('.flash__close').addEventListener('click', () => {
            this.hide();
        });

        // Auto-hide
        if (autoHide && message) {
            this._timeout = setTimeout(() => this.hide(), duration);
        }
    }

    getIcon(type) {
        const icons = {
            ok: '✓',
            err: '✕',
            info: 'ℹ',
            warning: '⚠'
        };
        return icons[type] || icons.info;
    }

    show(message, type = 'info', duration = 5000) {
        const flash = this.shadowRoot.querySelector('.flash');
        const messageEl = this.shadowRoot.querySelector('.flash__message');
        
        messageEl.textContent = message;
        flash.className = `flash flash--${type}`;
        flash.hidden = false;
        
        // Limpiar timeout anterior
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
        
        // Auto-hide
        this._timeout = setTimeout(() => this.hide(), duration);
    }

    hide() {
        const flash = this.shadowRoot.querySelector('.flash');
        flash.hidden = true;
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    static get observedAttributes() {
        return ['message', 'type', 'auto-hide', 'duration'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot) {
            if (name === 'message' || name === 'type') {
                this.connectedCallback(); // Re-render
            }
        }
    }

    disconnectedCallback() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
    }
}

customElements.define('flash-message', FlashMessage);
