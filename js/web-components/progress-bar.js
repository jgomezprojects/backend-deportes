/**
 * Web Component: Progress Bar
 * Componente reutilizable para barras de progreso
 */
class ProgressBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const value = parseInt(this.getAttribute('value')) || 0;
        const max = parseInt(this.getAttribute('max')) || 100;
        const label = this.getAttribute('label') || '';
        const showPercentage = this.getAttribute('show-percentage') !== 'false';
        const variant = this.getAttribute('variant') || 'default';
        const size = this.getAttribute('size') || 'md';

        const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
        const color = this.getColor(variant, percentage);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .progress-container {
                    width: 100%;
                }
                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--color-gray-700, #374151);
                }
                .progress-bar {
                    width: 100%;
                    background: var(--color-gray-200, #e2e8f0);
                    border-radius: 9999px;
                    overflow: hidden;
                    position: relative;
                }
                .progress-bar--sm {
                    height: 0.5rem;
                }
                .progress-bar--md {
                    height: 1rem;
                }
                .progress-bar--lg {
                    height: 1.5rem;
                }
                .progress-fill {
                    height: 100%;
                    background: ${color};
                    border-radius: 9999px;
                    transition: width 0.3s ease;
                    position: relative;
                }
                .progress-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }
                .progress-text {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: white;
                    position: absolute;
                    right: 0.5rem;
                    top: 50%;
                    transform: translateY(-50%);
                }
                .progress-percentage {
                    font-weight: 600;
                    color: ${color};
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                .progress-fill--animated {
                    animation: pulse 2s infinite;
                }
            </style>
            <div class="progress-container">
                ${label ? `
                    <div class="progress-label">
                        <span>${label}</span>
                        ${showPercentage ? `<span class="progress-percentage">${percentage}%</span>` : ''}
                    </div>
                ` : ''}
                <div class="progress-bar progress-bar--${size}">
                    <div class="progress-fill ${percentage < 100 ? 'progress-fill--animated' : ''}" 
                         style="width: ${percentage}%">
                        ${showPercentage && !label ? `<span class="progress-text">${percentage}%</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getColor(variant, percentage) {
        if (variant === 'success') {
            return 'var(--color-green-500, #22c55e)';
        } else if (variant === 'warning') {
            return 'var(--color-yellow-500, #eab308)';
        } else if (variant === 'danger') {
            return 'var(--color-red-500, #ef4444)';
        } else if (variant === 'info') {
            return 'var(--color-blue-500, #3b82f6)';
        } else {
            // Auto color based on percentage
            if (percentage >= 80) {
                return 'var(--color-green-500, #22c55e)';
            } else if (percentage >= 60) {
                return 'var(--color-yellow-500, #eab308)';
            } else if (percentage >= 40) {
                return 'var(--color-orange-500, #f97316)';
            } else {
                return 'var(--color-red-500, #ef4444)';
            }
        }
    }

    setValue(value) {
        this.setAttribute('value', value);
        this.connectedCallback();
    }

    setMax(max) {
        this.setAttribute('max', max);
        this.connectedCallback();
    }

    animateToValue(targetValue, duration = 1000) {
        const startValue = parseInt(this.getAttribute('value')) || 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = startValue + (targetValue - startValue) * this.easeOutQuad(progress);
            this.setValue(Math.round(currentValue));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    static get observedAttributes() {
        return ['value', 'max', 'label', 'show-percentage', 'variant', 'size'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && name === 'value' && oldValue !== newValue) {
            this.connectedCallback();
        }
    }
}

customElements.define('progress-bar', ProgressBar);
