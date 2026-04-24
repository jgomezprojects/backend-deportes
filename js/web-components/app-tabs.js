/**
 * Web Component: App Tabs
 * Componente reutilizable para tabs de navegación con slots
 */
class AppTabs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._activeTabName = null;
        this._tabs = [];
        this._panels = [];
        this._orientation = 'horizontal';
        this._variant = 'default';
        this._isInitialized = false;
    }

    connectedCallback() {
        this._orientation = this.getAttribute('orientation') || 'horizontal';
        this._variant = this.getAttribute('variant') || 'default';
        this._activeTabName = this.getAttribute('active-tab') || '';
        
        this._render();
        this._bindEvents();
        
        // Wait for slots to be populated
        setTimeout(() => this._initializeSlots(), 0);
    }

    _render() {
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
                }
                .tabs--vertical {
                    flex-direction: column;
                    width: 200px;
                }
                .tabs--pills {
                    background: transparent;
                    gap: 0.5rem;
                }
                .tabs--underline {
                    background: transparent;
                    border-bottom: 1px solid var(--color-gray-200, #e2e8f0);
                    padding: 0;
                    gap: 0;
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
                    position: relative;
                    white-space: nowrap;
                }
                .tabs--pills .tabs__btn {
                    border-radius: 9999px;
                }
                .tabs--underline .tabs__btn {
                    border-radius: 0;
                    border-bottom: 2px solid transparent;
                }
                .tabs__btn:hover {
                    color: var(--color-gray-900, #111827);
                    background: var(--color-gray-200, #e5e7eb);
                }
                .tabs--pills .tabs__btn:hover {
                    background: var(--color-gray-100, #f3f4f6);
                }
                .tabs--underline .tabs__btn:hover {
                    background: transparent;
                    border-bottom-color: var(--color-gray-300, #d1d5db);
                }
                .tabs__btn.is-active {
                    background: white;
                    color: var(--color-primary, #2563eb);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .tabs--pills .tabs__btn.is-active {
                    background: var(--color-primary, #2563eb);
                    color: white;
                }
                .tabs--underline .tabs__btn.is-active {
                    background: transparent;
                    border-bottom-color: var(--color-primary, #2563eb);
                    color: var(--color-primary, #2563eb);
                    box-shadow: none;
                }
                .tabs__btn:focus {
                    outline: 2px solid var(--color-primary, #2563eb);
                    outline-offset: 2px;
                }
                .tabs__btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .tabs__btn--icon {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .tabs__btn-icon {
                    font-size: 1rem;
                }
                .tabs__content {
                    margin-top: 1rem;
                }
                .tabs__panel {
                    display: none;
                }
                .tabs__panel.is-active {
                    display: block;
                }
            </style>
            <nav class="tabs tabs--${this._orientation} tabs--${this._variant}" 
                 role="tablist" 
                 aria-label="Secciones del panel">
                <slot name="tabs"></slot>
            </nav>
            <div class="tabs__content">
                <slot name="panels"></slot>
            </div>
        `;
    }

    _bindEvents() {
        // Handle keyboard navigation
        this.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    _handleKeyDown(event) {
        const tabs = this._tabs;
        if (tabs.length === 0) return;

        const activeIndex = tabs.findIndex(tab => tab.name === this._activeTabName);
        let newIndex = activeIndex;

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = activeIndex > 0 ? activeIndex - 1 : tabs.length - 1;
                break;
            case 'ArrowRight':
                event.preventDefault();
                newIndex = activeIndex < tabs.length - 1 ? activeIndex + 1 : 0;
                break;
            case 'Home':
                event.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                newIndex = tabs.length - 1;
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this._switchTab(this._activeTabName);
                return;
            default:
                return;
        }

        if (newIndex !== activeIndex && tabs[newIndex]) {
            this._switchTab(tabs[newIndex].name);
        }
    }

    _initializeSlots() {
        if (this._isInitialized) return;

        const tabsSlot = this.shadowRoot.querySelector('slot[name="tabs"]');
        const panelsSlot = this.shadowRoot.querySelector('slot[name="panels"]');
        
        if (!tabsSlot || !panelsSlot) return;

        this._tabs = Array.from(tabsSlot.assignedElements())
            .filter(el => el.tagName === 'APP-TAB')
            .map((tab, index) => {
                const name = tab.getAttribute('name') || `tab-${index}`;
                const label = tab.getAttribute('label') || name;
                
                tab.setAttribute('role', 'tab');
                tab.setAttribute('aria-selected', (name === this._activeTabName).toString());
                tab.setAttribute('aria-controls', `panel-${name}`);
                tab.setAttribute('tabindex', name === this._activeTabName ? '0' : '-1');
                tab.classList.toggle('is-active', name === this._activeTabName);
                
                // Listen for tab activation from child
                tab.addEventListener('tab-activate', (e) => {
                    this._switchTab(e.detail.name);
                });

                return { name, label, element: tab };
            });

        this._panels = Array.from(panelsSlot.assignedElements())
            .filter(el => el.tagName === 'APP-TAB-PANEL')
            .map((panel, index) => {
                const name = panel.getAttribute('name') || `panel-${index}`;
                
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', `tab-${name}`);
                panel.setAttribute('tabindex', '0');
                panel.classList.toggle('is-active', name === this._activeTabName);
                
                return { name, element: panel };
            });

        this._isInitialized = true;
        this._updateSections();
    }

    _switchTab(tabName) {
        if (this._activeTabName === tabName) return;

        const previousTabName = this._activeTabName;
        this._activeTabName = tabName;
        this.setAttribute('active-tab', tabName);

        // Update tab states
        this._tabs.forEach(tab => {
            const isActive = tab.name === tabName;
            tab.element.classList.toggle('is-active', isActive);
            tab.element.setAttribute('aria-selected', isActive.toString());
            tab.element.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // Update panel states
        this._panels.forEach(panel => {
            const isActive = panel.name === tabName;
            panel.element.classList.toggle('is-active', isActive);
        });

        // Update connected sections
        this._updateSections();

        // Trigger custom event
        this.dispatchEvent(new CustomEvent('tab-change', { 
            bubbles: true,
            detail: { 
                activeTab: tabName, 
                previousTab: previousTabName 
            }
        }));
    }

    _updateSections() {
        // Update app-section components
        document.querySelectorAll('app-section[panel-id]').forEach(section => {
            const panelId = section.getAttribute('panel-id');
            const isActive = panelId === this._activeTabName;
            section.setActive(isActive);
        });

        // Update traditional sections for compatibility
        document.querySelectorAll('.tab-panel[data-panel]').forEach(section => {
            const panelId = section.getAttribute('data-panel');
            const isActive = panelId === this._activeTabName;
            section.classList.toggle('is-active', isActive);
            section.hidden = !isActive;
            section.setAttribute('aria-selected', isActive.toString());
        });
    }

    // Public API
    addTab(name, label, index = null) {
        const newTab = { name, label };
        if (index !== null) {
            this._tabs.splice(index, 0, newTab);
        } else {
            this._tabs.push(newTab);
        }
        this._switchTab(name);
    }

    removeTab(name) {
        this._tabs = this._tabs.filter(tab => tab.name !== name);
        if (this._tabs.length > 0) {
            this._switchTab(this._tabs[0].name);
        }
    }

    setActiveTab(tabName) {
        this._switchTab(tabName);
    }

    getActiveTab() {
        return this._activeTabName;
    }

    getTabs() {
        return this._tabs.map(tab => ({ name: tab.name, label: tab.label }));
    }

    static get observedAttributes() {
        return ['active-tab', 'orientation', 'variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || this._isInitialized === false) return;
        
        switch (name) {
            case 'active-tab':
                if (newValue && this._tabs.some(tab => tab.name === newValue)) {
                    this._switchTab(newValue);
                }
                break;
            case 'orientation':
                this._orientation = newValue;
                this._render();
                this._bindEvents();
                break;
            case 'variant':
                this._variant = newValue;
                this._render();
                break;
        }
    }
}

// Register the component
customElements.define('app-tabs', AppTabs);
