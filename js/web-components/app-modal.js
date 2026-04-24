/**
 * Web Component: App Modal
 * Componente reutilizable para modales
 */
class AppModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._escapeHandler = this._handleEscape.bind(this);
    }

    connectedCallback() {
        const title = this.getAttribute('title') || 'Modal';
        const size = this.getAttribute('size') || 'md';
        const showClose = this.getAttribute('show-close') !== 'false';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s, visibility 0.3s;
                }
                .modal-overlay[open] {
                    opacity: 1;
                    visibility: visible;
                }
                .modal-dialog {
                    background: white;
                    border-radius: 0.75rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: hidden;
                    transform: scale(0.95);
                    transition: transform 0.3s;
                }
                .modal-overlay[open] .modal-dialog {
                    transform: scale(1);
                }
                .modal-dialog--sm {
                    width: 400px;
                }
                .modal-dialog--md {
                    width: 600px;
                }
                .modal-dialog--lg {
                    width: 800px;
                }
                .modal-dialog--xl {
                    width: 1000px;
                }
                .modal-header {
                    padding: 1.5rem 1.5rem 1rem;
                    border-bottom: 1px solid var(--color-gray-200, #e2e8f0);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                    color: var(--color-gray-900, #111827);
                }
                .modal-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.5rem;
                    color: var(--color-gray-500, #6b7280);
                    padding: 0.25rem;
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                }
                .modal-close:hover {
                    background: var(--color-gray-100, #f3f4f6);
                    color: var(--color-gray-700, #374151);
                }
                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    max-height: calc(90vh - 120px);
                }
                .modal-footer {
                    padding: 1rem 1.5rem 1.5rem;
                    border-top: 1px solid var(--color-gray-200, #e2e8f0);
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                }
                .modal-overlay[hidden] {
                    display: none;
                }
            </style>
            <div class="modal-overlay" hidden>
                <div class="modal-dialog modal-dialog--${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div class="modal-header">
                        <h2 id="modal-title" class="modal-title">${title}</h2>
                        ${showClose ? '<button type="button" class="modal-close" aria-label="Cerrar">×</button>' : ''}
                    </div>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                    <div class="modal-footer" hidden>
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        const closeBtn = this.shadowRoot.querySelector('.modal-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }

    show() {
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        overlay.hidden = false;
        // Trigger reflow for animation
        overlay.offsetHeight;
        overlay.setAttribute('open', '');
        document.addEventListener('keydown', this._escapeHandler);
        document.body.style.overflow = 'hidden';
        
        this.dispatchEvent(new CustomEvent('modal-open', { bubbles: true }));
    }

    close() {
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        overlay.removeAttribute('open');
        
        setTimeout(() => {
            overlay.hidden = true;
            document.body.style.overflow = '';
            document.removeEventListener('keydown', this._escapeHandler);
            this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true }));
        }, 300);
    }

    _handleEscape(e) {
        if (e.key === 'Escape') {
            this.close();
        }
    }

    setTitle(title) {
        this.setAttribute('title', title);
        const titleEl = this.shadowRoot.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    setContent(content) {
        const body = this.shadowRoot.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    }

    showFooter() {
        const footer = this.shadowRoot.querySelector('.modal-footer');
        if (footer) {
            footer.hidden = false;
        }
    }

    hideFooter() {
        const footer = this.shadowRoot.querySelector('.modal-footer');
        if (footer) {
            footer.hidden = true;
        }
    }

    static get observedAttributes() {
        return ['title', 'size', 'show-close'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot) {
            if (name === 'title') {
                const titleEl = this.shadowRoot.querySelector('.modal-title');
                if (titleEl) {
                    titleEl.textContent = newValue || 'Modal';
                }
            }
        }
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._escapeHandler);
        document.body.style.overflow = '';
    }
}

customElements.define('app-modal', AppModal);
