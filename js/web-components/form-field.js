/**
 * Web Component: Form Field
 * Componente reutilizable para campos de formulario
 */
class FormField extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const label = this.getAttribute('label') || '';
        const type = this.getAttribute('type') || 'text';
        const name = this.getAttribute('name') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const required = this.getAttribute('required') === 'true';
        const disabled = this.getAttribute('disabled') === 'true';
        const value = this.getAttribute('value') || '';
        const options = this.getAttribute('options') || '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 1rem;
                }
                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-gray-700, #374151);
                }
                .form-label.required::after {
                    content: ' *';
                    color: var(--color-red-500, #ef4444);
                }
                .form-input,
                .form-select {
                    padding: 0.75rem;
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    background: white;
                }
                .form-input:focus,
                .form-select:focus {
                    outline: none;
                    border-color: var(--color-primary, #2563eb);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .form-input:disabled,
                .form-select:disabled {
                    background: var(--color-gray-100, #f3f4f6);
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                .form-error {
                    font-size: 0.75rem;
                    color: var(--color-red-600, #dc2626);
                    margin-top: 0.25rem;
                }
                .form-help {
                    font-size: 0.75rem;
                    color: var(--color-gray-500, #6b7280);
                    margin-top: 0.25rem;
                }
            </style>
            <div class="form-field">
                ${label ? `<label class="form-label ${required ? 'required' : ''}">${label}</label>` : ''}
                ${this.renderInput(type, name, placeholder, required, disabled, value, options)}
                <slot name="help"></slot>
                <slot name="error"></slot>
            </div>
        `;

        // Add event listeners
        this.bindEvents();
    }

    renderInput(type, name, placeholder, required, disabled, value, options) {
        switch (type) {
            case 'select':
                const optionsArray = options ? options.split('|') : [];
                return `
                    <select class="form-select" name="${name}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>
                        <option value="">Seleccionar...</option>
                        ${optionsArray.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                `;
            
            case 'textarea':
                return `
                    <textarea class="form-input" name="${name}" placeholder="${placeholder}" 
                              ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} rows="4">${value}</textarea>
                `;
            
            case 'date':
                return `
                    <input type="date" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
            
            case 'time':
                return `
                    <input type="time" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
            
            case 'number':
                return `
                    <input type="number" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
            
            case 'email':
                return `
                    <input type="email" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
            
            case 'password':
                return `
                    <input type="password" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
            
            default:
                return `
                    <input type="text" class="form-input" name="${name}" 
                           placeholder="${placeholder}" ${required ? 'required' : ''} 
                           ${disabled ? 'disabled' : ''} value="${value}">
                `;
        }
    }

    bindEvents() {
        const input = this.shadowRoot.querySelector('.form-input, .form-select');
        if (input) {
            input.addEventListener('input', (e) => {
                this.dispatchEvent(new CustomEvent('input', { 
                    bubbles: true,
                    detail: { value: e.target.value, name: e.target.name }
                }));
            });

            input.addEventListener('change', (e) => {
                this.dispatchEvent(new CustomEvent('change', { 
                    bubbles: true,
                    detail: { value: e.target.value, name: e.target.name }
                }));
            });
        }
    }

    getValue() {
        const input = this.shadowRoot.querySelector('.form-input, .form-select');
        return input ? input.value : '';
    }

    setValue(value) {
        const input = this.shadowRoot.querySelector('.form-input, .form-select');
        if (input) {
            input.value = value;
        }
    }

    setError(message) {
        const errorSlot = this.shadowRoot.querySelector('slot[name="error"]');
        if (errorSlot) {
            errorSlot.innerHTML = `<div class="form-error">${message}</div>`;
        }
    }

    clearError() {
        const errorSlot = this.shadowRoot.querySelector('slot[name="error"]');
        if (errorSlot) {
            errorSlot.innerHTML = '';
        }
    }

    validate() {
        const input = this.shadowRoot.querySelector('.form-input, .form-select');
        const required = this.getAttribute('required') === 'true';
        
        if (required && !input.value.trim()) {
            this.setError('Este campo es obligatorio');
            return false;
        }
        
        this.clearError();
        return true;
    }

    static get observedAttributes() {
        return ['label', 'type', 'name', 'placeholder', 'required', 'disabled', 'value', 'options'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('form-field', FormField);
