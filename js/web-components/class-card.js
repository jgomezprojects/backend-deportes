/**
 * Web Component: Class Card
 * Componente reutilizable para tarjetas de clases deportivas
 */
class ClassCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const title = this.getAttribute('title') || '—';
        const subtitle = this.getAttribute('subtitle') || 'Clase abierta';
        const scheduleId = this.getAttribute('schedule-id');
        const metaLines = this.getAttribute('meta-lines') ? this.getAttribute('meta-lines').split('|') : [];
        
        // Normalizar key para el deporte
        const sportKey = this.normalizeSportKey(title);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .class-card {
                    background: white;
                    border: 1px solid var(--color-gray-200, #e2e8f0);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .class-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .class-card__media {
                    height: 120px;
                    background: var(--color-gray-100, #f8fafc);
                    position: relative;
                    overflow: hidden;
                }
                .sport-thumb {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .sport-thumb--futbol { background: #10b981; color: white; }
                .sport-thumb--basket { background: #f59e0b; color: white; }
                .sport-thumb--voleibol { background: #3b82f6; color: white; }
                .sport-thumb--tenis { background: #8b5cf6; color: white; }
                .sport-thumb--natacion { background: #06b6d4; color: white; }
                .sport-thumb--atletismo { background: #ef4444; color: white; }
                .sport-thumb--fitness { background: #ec4899; color: white; }
                .sport-thumb--default { background: #6b7280; color: white; }
                .class-card__body {
                    padding: 1.5rem;
                }
                .class-card__eyebrow {
                    font-size: 0.75rem;
                    color: var(--color-gray-600, #64748b);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 0.5rem 0;
                }
                .class-card__title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0 0 1rem 0;
                    color: var(--color-gray-900, #111827);
                }
                .class-card__facts {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 1.5rem 0;
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                }
                .class-card__facts li {
                    padding: 0.25rem 0;
                }
                .class-card__actions {
                    display: flex;
                    gap: 0.75rem;
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
                .btn--ghost {
                    background: transparent;
                    color: var(--color-gray-700, #374151);
                    border-color: var(--color-gray-300, #d1d5db);
                }
                .btn--ghost:hover {
                    background: var(--color-gray-50, #f9fafb);
                }
                .btn--primary {
                    background: var(--color-primary, #2563eb);
                    color: white;
                }
                .btn--primary:hover {
                    background: var(--color-primary-dark, #1d4ed8);
                }
                .btn--sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.8rem;
                }
            </style>
            <article class="class-card">
                <div class="class-card__media">
                    <div class="sport-thumb sport-thumb--${sportKey}" role="img" aria-hidden="true">${this.getSportIcon(sportKey)}</div>
                </div>
                <div class="class-card__body">
                    <p class="class-card__eyebrow">${subtitle}</p>
                    <h3 class="class-card__title">${title}</h3>
                    <ul class="class-card__facts">
                        ${metaLines.map(line => `<li>${line}</li>`).join('')}
                    </ul>
                    <div class="class-card__actions">
                        <button type="button" class="btn btn--ghost btn--sm js-detail">Ver detalle</button>
                        <button type="button" class="btn btn--primary js-enroll">Inscribirme</button>
                    </div>
                </div>
            </article>
        `;

        // Event listeners
        this.shadowRoot.querySelector('.js-detail').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('detail', { 
                bubbles: true,
                detail: { scheduleId: scheduleId }
            }));
        });

        this.shadowRoot.querySelector('.js-enroll').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('enroll', { 
                bubbles: true,
                detail: { scheduleId: scheduleId }
            }));
        });
    }

    normalizeSportKey(name) {
        const n = String(name || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (/fut|soccer/.test(n)) return "futbol";
        if (/basket|baloncest/.test(n)) return "basket";
        if (/vole|volley/.test(n)) return "voleibol";
        if (/tenis|tennis/.test(n)) return "tenis";
        if (/nat/.test(n)) return "natacion";
        if (/atlet/.test(n)) return "atletismo";
        if (/yoga|pilates/.test(n)) return "fitness";
        return "default";
    }

    getSportIcon(key) {
        const icons = {
            futbol: '⚽',
            basket: '🏀',
            voleibol: '🏐',
            tenis: '🎾',
            natacion: '🏊',
            atletismo: '🏃',
            fitness: '🧘',
            default: '🏋️'
        };
        return icons[key] || icons.default;
    }
}

customElements.define('class-card', ClassCard);
