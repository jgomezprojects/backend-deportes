/**
 * Web Component: App Table
 * Componente reutilizable para tablas con DataTables
 */
class AppTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const tableId = this.getAttribute('table-id') || '';
        const columns = this.getAttribute('columns') || '';
        const width = this.getAttribute('width') || '100%';
        const nowrap = this.getAttribute('nowrap') !== 'false';
        const display = this.getAttribute('display') || 'display';

        // Parse columns from attribute
        let tableHeaders = [];
        if (columns) {
            tableHeaders = columns.split('|').map(col => col.trim());
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .table-wrap {
                    overflow-x: auto;
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .data-table {
                    width: ${width};
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                .data-table th {
                    background: var(--color-gray-50, #f9fafb);
                    padding: 0.75rem 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: var(--color-gray-700, #374151);
                    border-bottom: 1px solid var(--color-gray-200, #e2e8f0);
                    white-space: ${nowrap ? 'nowrap' : 'normal'};
                }
                .data-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
                    color: var(--color-gray-700, #374151);
                    white-space: ${nowrap ? 'nowrap' : 'normal'};
                }
                .data-table tbody tr:hover {
                    background: var(--color-gray-50, #f9fafb);
                }
            </style>
            <div class="table-wrap">
                <table id="${tableId}" class="${display} ${nowrap ? 'nowrap' : ''}" style="width:${width}">
                    <thead>
                        <tr>
                            ${tableHeaders.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <slot name="table-body"></slot>
                    </tbody>
                </table>
            </div>
        `;

        // Maintain compatibility with DataTables initialization
        this.ensureDataTableCompatibility();
    }

    ensureDataTableCompatibility() {
        // Ensure the table is accessible from the main document for DataTables
        const tableId = this.getAttribute('table-id');
        if (tableId) {
            // Create a reference in the main document if it doesn't exist
            if (!document.getElementById(tableId)) {
                const table = this.shadowRoot.querySelector(`#${tableId}`);
                if (table) {
                    // Clone the table to the main document for DataTables compatibility
                    const clonedTable = table.cloneNode(true);
                    clonedTable.id = tableId;
                    clonedTable.style.display = 'none'; // Hide the clone
                    document.body.appendChild(clonedTable);
                    
                    // Sync changes between shadow and main table
                    this.syncTableWithMain(table, clonedTable);
                }
            }
        }
    }

    syncTableWithMain(shadowTable, mainTable) {
        // Sync tbody content
        const shadowTbody = shadowTable.querySelector('tbody');
        const mainTbody = mainTable.querySelector('tbody');
        
        if (shadowTbody && mainTbody) {
            const observer = new MutationObserver(() => {
                mainTbody.innerHTML = shadowTbody.innerHTML;
            });
            
            observer.observe(shadowTbody, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
        }
    }

    getTableElement() {
        const tableId = this.getAttribute('table-id');
        return document.getElementById(tableId) || this.shadowRoot.querySelector('table');
    }

    addRow(rowHtml) {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            const row = document.createElement('tr');
            row.innerHTML = rowHtml;
            tbody.appendChild(row);
        }
    }

    clearRows() {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }
    }

    static get observedAttributes() {
        return ['table-id', 'columns', 'width', 'nowrap', 'display'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            this.connectedCallback(); // Re-render on attribute change
        }
    }
}

customElements.define('app-table', AppTable);
