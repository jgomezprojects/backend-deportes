/**
 * Web Component: App Tab Panel
 * Componente panel para contenido de tab dentro de app-tabs
 */
class AppTabPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const name = this.getAttribute('name') || '';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .panel {
                    padding: 1rem;
                    background: white;
                    border-radius: 0.5rem;
                    border: 1px solid var(--color-gray-200, #e2e8f0);
                }
            </style>
            <div class="panel" role="tabpanel">
                <slot></slot>
            </div>
        `;
    }

    static get observedAttributes() {
        return ['name'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

// Register the component
customElements.define('app-tab-panel', AppTabPanel);
