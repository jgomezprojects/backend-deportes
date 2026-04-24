/**
 * Web Component: App Button
 * Componente reutilizable para botones con múltiples variantes
 */
class AppButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const variant = this.getAttribute('variant') || 'primary';
        const size = this.getAttribute('size') || 'md';
        const type = this.getAttribute('type') || 'button';
        const disabled = this.getAttribute('disabled') === 'true';
        const loading = this.getAttribute('loading') === 'true';
        const text = this.textContent || this.getAttribute('text') || 'Botón';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                .btn {
                    padding: 0.5rem 1rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    font-family: inherit;
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    min-width: fit-content;
                }
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btn--sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.8rem;
                }
                .btn--lg {
                    padding: 0.75rem 1.5rem;
                    font-size: 1rem;
                }
                .btn--primary {
                    background: var(--color-primary, #2563eb);
                    color: white;
                    border-color: var(--color-primary, #2563eb);
                }
                .btn--primary:hover:not(:disabled) {
                    background: var(--color-primary-dark, #1d4ed8);
                    border-color: var(--color-primary-dark, #1d4ed8);
                }
                .btn--ghost {
                    background: transparent;
                    color: var(--color-gray-700, #374151);
                    border-color: var(--color-gray-300, #d1d5db);
                }
                .btn--ghost:hover:not(:disabled) {
                    background: var(--color-gray-50, #f9fafb);
                }
                .btn--secondary {
                    background: var(--color-gray-100, #f8fafc);
                    color: var(--color-gray-700, #374151);
                    border-color: var(--color-gray-300, #d1d5db);
                }
                .btn--secondary:hover:not(:disabled) {
                    background: var(--color-gray-200, #e2e8f0);
                }
                .btn--danger {
                    background: var(--color-danger, #dc2626);
                    color: white;
                    border-color: var(--color-danger, #dc2626);
                }
                .btn--danger:hover:not(:disabled) {
                    background: var(--color-danger-dark, #b91c1c);
                    border-color: var(--color-danger-dark, #b91c1c);
                }
                .btn--landing {
                    padding: 0.75rem 2rem;
                    font-size: 1rem;
                    font-weight: 600;
                    border-radius: 0.5rem;
                }
                .btn--landing--primary {
                    background: var(--color-primary, #2563eb);
                    color: white;
                    border-color: var(--color-primary, #2563eb);
                }
                .btn--landing--primary:hover:not(:disabled) {
                    background: var(--color-primary-dark, #1d4ed8);
                    border-color: var(--color-primary-dark, #1d4ed8);
                }
                .btn--landing--ghost {
                    background: transparent;
                    color: var(--color-gray-700, #374151);
                    border-color: var(--color-gray-300, #d1d5db);
                    border-width: 2px;
                }
                .btn--landing--ghost:hover:not(:disabled) {
                    background: var(--color-gray-50, #f9fafb);
                }
                .btn__spinner {
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            <button class="btn btn--${variant} btn--${size}" type="${type}" ${disabled ? 'disabled' : ''}>
                ${loading ? '<span class="btn__spinner"></span>' : ''}
                <slot>${text}</slot>
            </button>
        `;

        // Mantener eventos del botón
        const button = this.shadowRoot.querySelector('button');
        button.addEventListener('click', (e) => {
            if (!disabled && !loading) {
                this.dispatchEvent(new CustomEvent('click', { bubbles: true }));
            }
        });
    }

    static get observedAttributes() {
        return ['disabled', 'loading', 'text'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot) {
            const button = this.shadowRoot.querySelector('button');
            if (name === 'disabled') {
                button.disabled = newValue === 'true';
            } else if (name === 'loading') {
                this.connectedCallback(); // Re-render para mostrar spinner
            } else if (name === 'text') {
                const slot = this.shadowRoot.querySelector('slot');
                if (slot && !this.textContent.trim()) {
                    slot.textContent = newValue || 'Botón';
                }
            }
        }
    }
}

customElements.define('app-button', AppButton);
