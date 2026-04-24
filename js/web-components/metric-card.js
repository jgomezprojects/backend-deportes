/**
 * Web Component: Metric Card
 * Componente reutilizable para mostrar métricas y KPIs
 */
class MetricCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const value = this.getAttribute('value') || '0';
        const label = this.getAttribute('label') || 'Métrica';
        const change = this.getAttribute('change') || '0';
        const changeType = this.getAttribute('change-type') || 'neutral';
        const icon = this.getAttribute('icon') || '📊';
        const variant = this.getAttribute('variant') || 'default';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .metric-card {
                    background: white;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid var(--color-gray-200, #e2e8f0);
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .metric-card--gradient {
                    background: linear-gradient(135deg, var(--color-primary, #2563eb), var(--color-primary-dark, #1d4ed8));
                    color: white;
                    border: none;
                }
                .metric-card--success {
                    background: linear-gradient(135deg, var(--color-green-500, #22c55e), var(--color-green-600, #16a34a));
                    color: white;
                    border: none;
                }
                .metric-card--warning {
                    background: linear-gradient(135deg, var(--color-yellow-500, #eab308), var(--color-yellow-600, #ca8a04));
                    color: white;
                    border: none;
                }
                .metric-card--danger {
                    background: linear-gradient(135deg, var(--color-red-500, #ef4444), var(--color-red-600, #dc2626));
                    color: white;
                    border: none;
                }
                .metric-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }
                .metric-icon {
                    font-size: 2rem;
                    opacity: 0.8;
                }
                .metric-value {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    line-height: 1;
                }
                .metric-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    margin-bottom: 0.75rem;
                }
                .metric-change {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    background: rgba(255,255,255,0.2);
                }
                .metric-change--positive {
                    color: var(--color-green-600, #16a34a);
                }
                .metric-card--gradient .metric-change--positive,
                .metric-card--success .metric-change--positive {
                    color: white;
                    background: rgba(255,255,255,0.3);
                }
                .metric-change--negative {
                    color: var(--color-red-600, #dc2626);
                }
                .metric-card--gradient .metric-change--negative,
                .metric-card--danger .metric-change--negative {
                    color: white;
                    background: rgba(255,255,255,0.3);
                }
                .metric-change--neutral {
                    color: var(--color-gray-600, #64748b);
                }
                .metric-card--gradient .metric-change--neutral {
                    color: white;
                    background: rgba(255,255,255,0.3);
                }
                .metric-trend {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    font-size: 0.875rem;
                    opacity: 0.6;
                }
                @media (max-width: 640px) {
                    .metric-card {
                        padding: 1rem;
                    }
                    .metric-value {
                        font-size: 1.5rem;
                    }
                    .metric-icon {
                        font-size: 1.5rem;
                    }
                }
            </style>
            <div class="metric-card metric-card--${variant}">
                <div class="metric-header">
                    <div class="metric-icon">${icon}</div>
                    <div class="metric-trend">${this.getTrendIcon(changeType)}</div>
                </div>
                <div class="metric-value">${value}</div>
                <div class="metric-label">${label}</div>
                <div class="metric-change metric-change--${changeType}">
                    ${this.getTrendIcon(changeType)} ${change}
                </div>
            </div>
        `;
    }

    getTrendIcon(type) {
        const icons = {
            positive: '📈',
            negative: '📉',
            neutral: '➡️'
        };
        return icons[type] || icons.neutral;
    }

    updateValue(value) {
        this.setAttribute('value', value);
        const valueEl = this.shadowRoot.querySelector('.metric-value');
        if (valueEl) {
            valueEl.textContent = value;
        }
    }

    updateChange(change, type) {
        this.setAttribute('change', change);
        this.setAttribute('change-type', type);
        
        const changeEl = this.shadowRoot.querySelector('.metric-change');
        if (changeEl) {
            changeEl.className = `metric-change metric-change--${type}`;
            changeEl.innerHTML = `${this.getTrendIcon(type)} ${change}`;
        }
    }

    static get observedAttributes() {
        return ['value', 'label', 'change', 'change-type', 'icon', 'variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('metric-card', MetricCard);
