/**
 * Web Component: App Section
 * Componente reutilizable para secciones con título y descripción
 */
class AppSection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const title = this.getAttribute('title') || '';
        const description = this.getAttribute('description') || '';
        const panelId = this.getAttribute('panel-id') || '';
        const isActive = this.getAttribute('active') === 'true';
        const showKpi = this.getAttribute('show-kpi') === 'true';
        const kpiId = this.getAttribute('kpi-id') || '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .section {
                    width: 100%;
                }
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                    color: var(--color-gray-900, #111827);
                }
                .section-desc {
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                    margin: 0 0 2rem 0;
                    line-height: 1.5;
                }
                .section-content {
                    width: 100%;
                }
                .kpi-band {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                }
            </style>
            <section class="section ${panelId ? `tab-panel ${isActive ? 'is-active' : ''}` : ''}" 
                    ${panelId ? `role="tabpanel" data-panel="${panelId}" ${!isActive ? 'hidden' : ''}` : ''}>
                ${title ? `<h2 class="section-title">${title}</h2>` : ''}
                ${description ? `<p class="section-desc">${description}</p>` : ''}
                ${showKpi ? `<div class="kpi-band" id="${kpiId}"></div>` : ''}
                <div class="section-content">
                    <slot></slot>
                </div>
            </section>
        `;
    }

    setTitle(title) {
        this.setAttribute('title', title);
        const titleEl = this.shadowRoot.querySelector('.section-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    setDescription(description) {
        this.setAttribute('description', description);
        const descEl = this.shadowRoot.querySelector('.section-desc');
        if (descEl) {
            descEl.textContent = description;
        }
    }

    setActive(active) {
        this.setAttribute('active', active.toString());
        const section = this.shadowRoot.querySelector('.section');
        if (section) {
            section.classList.toggle('is-active', active);
            section.hidden = !active;
        }
        
        // Update ARIA attributes
        if (section) {
            section.setAttribute('aria-selected', active.toString());
        }
        
        // Trigger event for other components
        this.dispatchEvent(new CustomEvent('section-activated', { 
            bubbles: true,
            detail: { panelId: this.getAttribute('panel-id'), active }
        }));
    }

    static get observedAttributes() {
        return ['title', 'description', 'panel-id', 'active', 'show-kpi', 'kpi-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('app-section', AppSection);
