/**
 * Web Component: Simple Tabs
 * Componente compatible con la estructura actual de tabs de la aplicación
 */
class SimpleTabs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const tabsData = this.getAttribute('tabs') || '';
        const activeTab = this.getAttribute('active-tab') || '';
        
        // Parse tabs from attribute or use default structure
        let tabs = [];
        if (tabsData) {
            tabs = tabsData.split('|').map(tab => {
                const [name, label] = tab.split(':');
                return { name: name.trim(), label: label.trim() || name.trim() };
            });
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .tabs {
                    display: flex;
                    gap: 0.25rem;
                    background: var(--color-gray-100, #f3f4f6);
                    padding: 0.25rem;
                    border-radius: 0.5rem;
                    role: tablist;
                }
                .tabs__btn {
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
                    white-space: nowrap;
                }
                .tabs__btn:hover {
                    color: var(--color-gray-900, #111827);
                    background: var(--color-gray-200, #e5e7eb);
                }
                .tabs__btn.is-active {
                    background: white;
                    color: var(--color-primary, #2563eb);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .tabs__btn:focus {
                    outline: 2px solid var(--color-primary, #2563eb);
                    outline-offset: 2px;
                }
            </style>
            <nav class="tabs" role="tablist" aria-label="Secciones del panel">
                ${tabs.map(tab => `
                    <button type="button" 
                            class="tabs__btn ${tab.name === activeTab ? 'is-active' : ''}" 
                            role="tab" 
                            aria-selected="${tab.name === activeTab ? 'true' : 'false'}" 
                            data-tab="${tab.name}">
                        ${tab.label}
                    </button>
                `).join('')}
            </nav>
        `;

        // Add event listeners for tab switching
        this.shadowRoot.querySelectorAll('.tabs__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update internal state
        this.setAttribute('active-tab', tabName);

        // Update button states
        this.shadowRoot.querySelectorAll('.tabs__btn').forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive.toString());
        });

        // Trigger tab change event for main document
        this.dispatchEvent(new CustomEvent('tab-change', { 
            bubbles: true,
            detail: { activeTab: tabName }
        }));

        // Also trigger the original tab switching logic if it exists
        if (typeof window.initTabs === 'function') {
            // Simulate click on original tab button if it exists
            const originalBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (originalBtn) {
                originalBtn.click();
            }
        }
    }

    static get observedAttributes() {
        return ['tabs', 'active-tab'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && name === 'active-tab' && oldValue !== newValue) {
            this.switchTab(newValue);
        }
    }
}

customElements.define('simple-tabs', SimpleTabs);
