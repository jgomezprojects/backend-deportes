/**
 * Web Component: User Item
 * Componente reutilizable para items de lista de usuarios
 */
class UserItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const name = this.getAttribute('name') || '—';
        const role = this.getAttribute('role') || '—';
        const email = this.getAttribute('email') || '—';
        const career = this.getAttribute('career') || '';
        const showActions = this.getAttribute('show-actions') !== 'false';
        const variant = this.getAttribute('variant') || 'table-row';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: contents;
                }
                .user-item--card {
                    background: white;
                    border: 1px solid var(--color-gray-200, #e2e8f0);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: box-shadow 0.2s;
                }
                .user-item--card:hover {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .user-info {
                    flex: 1;
                }
                .user-name {
                    font-weight: 600;
                    color: var(--color-gray-900, #111827);
                    margin-bottom: 0.25rem;
                }
                .user-details {
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                    line-height: 1.4;
                }
                .user-role {
                    display: inline-block;
                    padding: 0.125rem 0.5rem;
                    background: var(--color-gray-100, #f3f4f6);
                    color: var(--color-gray-700, #374151);
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    margin-right: 0.5rem;
                }
                .user-role--student {
                    background: var(--color-blue-100, #dbeafe);
                    color: var(--color-blue-700, #1d4ed8);
                }
                .user-role--teacher {
                    background: var(--color-green-100, #dcfce7);
                    color: var(--color-green-700, #15803d);
                }
                .user-role--admin {
                    background: var(--color-purple-100, #f3e8ff);
                    color: var(--color-purple-700, #7c3aed);
                }
                .user-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .btn {
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.375rem;
                    font-size: 0.8rem;
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
                .btn--danger {
                    background: var(--color-danger, #dc2626);
                    color: white;
                    border-color: var(--color-danger, #dc2626);
                }
                .btn--danger:hover {
                    background: var(--color-danger-dark, #b91c1c);
                }
                .btn--sm {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }
                .user-avatar {
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: 50%;
                    background: var(--color-gray-200, #e2e8f0);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: var(--color-gray-600, #64748b);
                    margin-right: 1rem;
                    flex-shrink: 0;
                }
            </style>
            
            ${variant === 'table-row' ? `
                <tr>
                    <td>${name}</td>
                    <td><span class="user-role user-role--${this.getRoleClass(role)}">${role}</span></td>
                    <td>${email}</td>
                    <td>${career || '—'}</td>
                    ${showActions ? `
                        <td>
                            <div class="user-actions">
                                <button type="button" class="btn btn--ghost btn--sm js-edit">Editar</button>
                                <button type="button" class="btn btn--danger btn--sm js-delete">Eliminar</button>
                            </div>
                        </td>
                    ` : ''}
                </tr>
            ` : `
                <div class="user-item--card">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="user-avatar">${this.getInitials(name)}</div>
                        <div class="user-info">
                            <div class="user-name">${name}</div>
                            <div class="user-details">
                                <span class="user-role user-role--${this.getRoleClass(role)}">${role}</span>
                                ${email ? `<span>${email}</span>` : ''}
                                ${career ? `<span>· ${career}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    ${showActions ? `
                        <div class="user-actions">
                            <button type="button" class="btn btn--ghost btn--sm js-edit">Editar</button>
                            <button type="button" class="btn btn--danger btn--sm js-delete">Eliminar</button>
                        </div>
                    ` : ''}
                </div>
            `}
        `;

        // Event listeners
        const editBtn = this.shadowRoot.querySelector('.js-edit');
        const deleteBtn = this.shadowRoot.querySelector('.js-delete');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('edit', { 
                    bubbles: true,
                    detail: { name, role, email, career }
                }));
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('delete', { 
                    bubbles: true,
                    detail: { name, role, email, career }
                }));
            });
        }
    }

    getRoleClass(role) {
        const normalized = String(role || '').toLowerCase();
        if (normalized.includes('estudiante') || normalized.includes('student')) return 'student';
        if (normalized.includes('profesor') || normalized.includes('teacher')) return 'teacher';
        if (normalized.includes('admin')) return 'admin';
        return '';
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = String(name).trim().split(' ');
        if (parts.length >= 2) {
            return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
        }
        return parts[0][0].toUpperCase();
    }

    updateData(data) {
        if (data.name) this.setAttribute('name', data.name);
        if (data.role) this.setAttribute('role', data.role);
        if (data.email) this.setAttribute('email', data.email);
        if (data.career) this.setAttribute('career', data.career);
    }

    static get observedAttributes() {
        return ['name', 'role', 'email', 'career', 'show-actions', 'variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('user-item', UserItem);
