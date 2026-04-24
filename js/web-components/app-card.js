/**
 * Web Component: App Card
 * Componente reutilizable para bloques tipo card/panel
 */
class AppCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const variant = this.getAttribute('variant') || 'default';
        const title = this.getAttribute('title') || '';
        const label = this.getAttribute('label') || '';
        const meta = this.getAttribute('meta') || '';
        const padding = this.getAttribute('padding') || 'normal';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .card {
                    background: white;
                    border-radius: 0.75rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    padding: ${this.getPadding(padding)};
                    border: 1px solid var(--color-gray-200, #e2e8f0);
                }
                .card--admin {
                    background: var(--color-gray-50, #f9fafb);
                    border: 1px solid var(--color-gray-300, #d1d5db);
                }
                .card--create {
                    background: linear-gradient(135deg, var(--color-primary, #2563eb), var(--color-primary-dark, #1d4ed8));
                    color: white;
                }
                .card__label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-gray-600, #64748b);
                    margin: 0 0 0.5rem 0;
                }
                .card--create .card__label {
                    color: rgba(255,255,255,0.8);
                }
                .card__title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0 0 0.75rem 0;
                    color: var(--color-gray-900, #111827);
                }
                .card--create .card__title {
                    color: white;
                }
                .card__meta {
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                    margin: 0 0 1rem 0;
                    line-height: 1.5;
                }
                .card--create .card__meta {
                    color: rgba(255,255,255,0.9);
                }
                .card__content {
                    margin-top: 1rem;
                }
                .card__actions {
                    margin-top: 1rem;
                    display: flex;
                    gap: 0.75rem;
                }
                .admin-form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                .admin-form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .admin-form-field span {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-gray-700, #374151);
                }
                .admin-form-field input,
                .admin-form-field select {
                    padding: 0.5rem;
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                }
                .admin-form-field input:focus,
                .admin-form-field select:focus {
                    outline: none;
                    border-color: var(--color-primary, #2563eb);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .admin-form-actions {
                    grid-column: 1 / -1;
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }
                .btn {
                    padding: 0.5rem 1rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .btn--primary {
                    background: var(--color-primary, #2563eb);
                    color: white;
                    border-color: var(--color-primary, #2563eb);
                }
                .btn--primary:hover {
                    background: var(--color-primary-dark, #1d4ed8);
                }
                .role-block {
                    margin-bottom: 2rem;
                }
                .role-block__title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0 0 1rem 0;
                    color: var(--color-gray-900, #111827);
                }
            </style>
            <div class="card card--${variant}">
                ${label ? `<p class="card__label">${label}</p>` : ''}
                ${title ? `<h3 class="card__title">${title}</h3>` : ''}
                ${meta ? `<p class="card__meta">${meta}</p>` : ''}
                <div class="card__content">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    getPadding(padding) {
        const paddings = {
            tight: '1rem',
            normal: '1.5rem',
            loose: '2rem'
        };
        return paddings[padding] || paddings.normal;
    }

    setTitle(title) {
        this.setAttribute('title', title);
        const titleEl = this.shadowRoot.querySelector('.card__title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    setLabel(label) {
        this.setAttribute('label', label);
        const labelEl = this.shadowRoot.querySelector('.card__label');
        if (labelEl) {
            labelEl.textContent = label;
        }
    }

    static get observedAttributes() {
        return ['variant', 'title', 'label', 'meta', 'padding'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('app-card', AppCard);
