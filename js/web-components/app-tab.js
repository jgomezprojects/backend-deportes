/**
 * Web Component: App Tab
 * Componente individual para tab dentro de app-tabs
 */
class AppTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const name = this.getAttribute('name') || '';
        const label = this.getAttribute('label') || name;
        const icon = this.getAttribute('icon') || '';
        const disabled = this.getAttribute('disabled') === 'true';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .tab {
                    flex: 1;
                    padding: 0.5rem 1rem;
                    border: none;
                    background: transparent;
                    color: var(--color-gray-600, #64748b);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    position: relative;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .tab:hover {
                    color: var(--color-gray-900, #111827);
                    background: var(--color-gray-200, #e5e7eb);
                }
                .tab.is-active {
                    background: white;
                    color: var(--color-primary, #2563eb);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .tab:focus {
                    outline: 2px solid var(--color-primary, #2563eb);
                    outline-offset: 2px;
                }
                .tab:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .tab-icon {
                    font-size: 1rem;
                }
            </style>
            <button type="button" 
                    class="tab" 
                    role="tab" 
                    ${disabled ? 'disabled' : ''}
                    data-tab="${name}">
                ${icon ? `<span class="tab-icon">${icon}</span>` : ''}
                <span class="tab-label">${label}</span>
            </button>
        `;

        // Bind events within Shadow DOM
        this._bindEvents();
    }

    _bindEvents() {
        const tab = this.shadowRoot.querySelector('.tab');
        if (tab) {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this._activateTab();
            });

            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._activateTab();
                }
            });
        }
    }

    _activateTab() {
        const name = this.getAttribute('name');
        
        // Emit custom event to parent
        this.dispatchEvent(new CustomEvent('tab-activate', { 
            bubbles: true,
            detail: { name }
        }));
    }

    setActive(active) {
        const tab = this.shadowRoot.querySelector('.tab');
        if (tab) {
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active.toString());
        }
    }

    setDisabled(disabled) {
        const tab = this.shadowRoot.querySelector('.tab');
        if (tab) {
            tab.disabled = disabled;
        }
    }

    static get observedAttributes() {
        return ['name', 'label', 'icon', 'disabled'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

// Register the component
customElements.define('app-tab', AppTab);
