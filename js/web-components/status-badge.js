/**
 * Web Component: Status Badge
 * Componente reutilizable para badges de estado
 */
class StatusBadge extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const status = this.getAttribute('status') || 'default';
        const text = this.getAttribute('text') || '';
        const size = this.getAttribute('size') || 'md';
        const icon = this.getAttribute('icon') || '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.2s;
                }
                .badge--sm {
                    padding: 0.125rem 0.5rem;
                    font-size: 0.625rem;
                }
                .badge--lg {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                }
                .badge--default {
                    background: var(--color-gray-100, #f3f4f6);
                    color: var(--color-gray-700, #374151);
                }
                .badge--success {
                    background: var(--color-green-100, #dcfce7);
                    color: var(--color-green-700, #15803d);
                }
                .badge--warning {
                    background: var(--color-yellow-100, #fef3c7);
                    color: var(--color-yellow-700, #a16207);
                }
                .badge--error {
                    background: var(--color-red-100, #fef2f2);
                    color: var(--color-red-700, #b91c1c);
                }
                .badge--info {
                    background: var(--color-blue-100, #dbeafe);
                    color: var(--color-blue-700, #1d4ed8);
                }
                .badge--primary {
                    background: var(--color-primary-100, #dbeafe);
                    color: var(--color-primary-700, #1d4ed8);
                }
                .badge--secondary {
                    background: var(--color-gray-200, #e5e7eb);
                    color: var(--color-gray-700, #374151);
                }
                .badge--outline {
                    background: transparent;
                    border: 1px solid currentColor;
                }
                .badge--outline.badge--success {
                    color: var(--color-green-600, #16a34a);
                }
                .badge--outline.badge--warning {
                    color: var(--color-yellow-600, #ca8a04);
                }
                .badge--outline.badge--error {
                    color: var(--color-red-600, #dc2626);
                }
                .badge--outline.badge--info {
                    color: var(--color-blue-600, #2563eb);
                }
                .badge-icon {
                    font-size: 0.875rem;
                }
                .badge--sm .badge-icon {
                    font-size: 0.75rem;
                }
                .badge--lg .badge-icon {
                    font-size: 1rem;
                }
                .badge:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .badge--pulse {
                    animation: pulse 2s infinite;
                }
            </style>
            <span class="badge badge--${status} badge--${size} ${this.getAttribute('pulse') === 'true' ? 'badge--pulse' : ''}">
                ${icon ? `<span class="badge-icon">${icon}</span>` : ''}
                <span class="badge-text">${text}</span>
            </span>
        `;
    }

    updateStatus(status) {
        this.setAttribute('status', status);
        this.connectedCallback();
    }

    updateText(text) {
        this.setAttribute('text', text);
        const textEl = this.shadowRoot.querySelector('.badge-text');
        if (textEl) {
            textEl.textContent = text;
        }
    }

    static get observedAttributes() {
        return ['status', 'text', 'size', 'icon', 'pulse'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('status-badge', StatusBadge);
