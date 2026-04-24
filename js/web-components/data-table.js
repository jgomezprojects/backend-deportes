/**
 * Web Component: Data Table
 * Componente reutilizable para tablas de datos con paginación y ordenamiento
 */
class DataTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._data = [];
        this._columns = [];
        this._currentPage = 1;
        this._rowsPerPage = 10;
        this._sortColumn = null;
        this._sortDirection = 'asc';
    }

    connectedCallback() {
        const title = this.getAttribute('title') || '';
        const showPagination = this.getAttribute('show-pagination') !== 'false';
        const rowsPerPage = parseInt(this.getAttribute('rows-per-page')) || 10;
        const striped = this.getAttribute('striped') !== 'false';
        const hover = this.getAttribute('hover') !== 'false';
        const compact = this.getAttribute('compact') === 'true';

        this._rowsPerPage = rowsPerPage;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .data-table-container {
                    background: white;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .data-table-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--color-gray-200, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .data-table-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--color-gray-900, #111827);
                    margin: 0;
                }
                .data-table-controls {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                .data-table-search {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    min-width: 200px;
                }
                .data-table-search:focus {
                    outline: none;
                    border-color: var(--color-primary, #2563eb);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .data-table-wrapper {
                    overflow-x: auto;
                }
                .data-table {
                    width: 100%;
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
                    white-space: nowrap;
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                }
                .data-table th:hover {
                    background: var(--color-gray-100, #f3f4f6);
                }
                .data-table th.sortable::after {
                    content: '⇅';
                    position: absolute;
                    right: 0.5rem;
                    opacity: 0.3;
                    font-size: 0.75rem;
                }
                .data-table th.sort-asc::after {
                    content: '↑';
                    opacity: 1;
                }
                .data-table th.sort-desc::after {
                    content: '↓';
                    opacity: 1;
                }
                .data-table td {
                    padding: ${compact ? '0.5rem 1rem' : '0.75rem 1rem'};
                    border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
                    color: var(--color-gray-700, #374151);
                }
                .data-table tr:last-child td {
                    border-bottom: none;
                }
                .data-table tbody tr:hover {
                    background: var(--color-gray-50, #f9fafb);
                }
                .data-table tbody tr.striped:nth-child(even) {
                    background: var(--color-gray-50, #f9fafb);
                }
                .data-table tbody tr.striped:nth-child(even):hover {
                    background: var(--color-gray-100, #f3f4f6);
                }
                .data-table-empty {
                    padding: 3rem 1.5rem;
                    text-align: center;
                    color: var(--color-gray-500, #6b7280);
                    font-style: italic;
                }
                .data-table-pagination {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--color-gray-200, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.875rem;
                    color: var(--color-gray-600, #64748b);
                }
                .data-table-pagination-info {
                    flex: 1;
                }
                .data-table-pagination-controls {
                    display: flex;
                    gap: 0.5rem;
                }
                .pagination-btn {
                    padding: 0.375rem 0.75rem;
                    border: 1px solid var(--color-gray-300, #d1d5db);
                    background: white;
                    color: var(--color-gray-700, #374151);
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .pagination-btn:hover:not(:disabled) {
                    background: var(--color-gray-50, #f9fafb);
                }
                .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .pagination-btn.active {
                    background: var(--color-primary, #2563eb);
                    color: white;
                    border-color: var(--color-primary, #2563eb);
                }
            </style>
            <div class="data-table-container">
                ${title ? `
                    <div class="data-table-header">
                        <h3 class="data-table-title">${title}</h3>
                        <div class="data-table-controls">
                            <input type="text" class="data-table-search" placeholder="Buscar..." />
                        </div>
                    </div>
                ` : ''}
                <div class="data-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr id="table-header"></tr>
                        </thead>
                        <tbody id="table-body"></tbody>
                    </table>
                </div>
                ${showPagination ? `
                    <div class="data-table-pagination">
                        <div class="data-table-pagination-info">
                            <span id="pagination-info"></span>
                        </div>
                        <div class="data-table-pagination-controls" id="pagination-controls"></div>
                    </div>
                ` : ''}
            </div>
        `;

        this._initializeEventListeners();
        this._render();
    }

    _initializeEventListeners() {
        const searchInput = this.shadowRoot.querySelector('.data-table-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchTerm = e.target.value.toLowerCase();
                this._currentPage = 1;
                this._render();
            });
        }
    }

    setColumns(columns) {
        this._columns = columns;
        this._render();
    }

    setData(data) {
        this._data = data;
        this._currentPage = 1;
        this._render();
    }

    addRow(rowData) {
        this._data.push(rowData);
        this._render();
    }

    removeRow(index) {
        this._data.splice(index, 1);
        this._render();
    }

    updateRow(index, rowData) {
        this._data[index] = rowData;
        this._render();
    }

    _getFilteredData() {
        if (!this._searchTerm) return this._data;
        
        return this._data.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(this._searchTerm)
            );
        });
    }

    _getSortedData(data) {
        if (!this._sortColumn) return data;
        
        return [...data].sort((a, b) => {
            const aVal = a[this._sortColumn];
            const bVal = b[this._sortColumn];
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;
            
            return this._sortDirection === 'desc' ? -comparison : comparison;
        });
    }

    _getPaginatedData(data) {
        const start = (this._currentPage - 1) * this._rowsPerPage;
        const end = start + this._rowsPerPage;
        return data.slice(start, end);
    }

    _render() {
        const headerRow = this.shadowRoot.querySelector('#table-header');
        const tableBody = this.shadowRoot.querySelector('#table-body');
        
        // Render headers
        headerRow.innerHTML = '';
        this._columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.label;
            th.className = column.sortable !== false ? 'sortable' : '';
            th.dataset.column = column.key;
            
            if (column.key === this._sortColumn) {
                th.classList.add(`sort-${this._sortDirection}`);
            }
            
            if (column.sortable !== false) {
                th.addEventListener('click', () => this._sort(column.key));
            }
            
            headerRow.appendChild(th);
        });
        
        // Get and render data
        const filteredData = this._getFilteredData();
        const sortedData = this._getSortedData(filteredData);
        const paginatedData = this._getPaginatedData(sortedData);
        
        tableBody.innerHTML = '';
        
        if (paginatedData.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="${this._columns.length}" class="data-table-empty">
                ${this._searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles'}
            </td>`;
            tableBody.appendChild(emptyRow);
        } else {
            paginatedData.forEach(row => {
                const tr = document.createElement('tr');
                if (this.getAttribute('striped') !== 'false') {
                    tr.classList.add('striped');
                }
                
                this._columns.forEach(column => {
                    const td = document.createElement('td');
                    const value = row[column.key];
                    
                    if (column.render) {
                        td.innerHTML = column.render(value, row);
                    } else {
                        td.textContent = value || '—';
                    }
                    
                    tr.appendChild(td);
                });
                
                tableBody.appendChild(tr);
            });
        }
        
        this._renderPagination(filteredData.length);
    }

    _sort(column) {
        if (this._sortColumn === column) {
            this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this._sortColumn = column;
            this._sortDirection = 'asc';
        }
        
        this._render();
    }

    _renderPagination(totalItems) {
        const paginationInfo = this.shadowRoot.querySelector('#pagination-info');
        const paginationControls = this.shadowRoot.querySelector('#pagination-controls');
        
        if (!paginationInfo || !paginationControls) return;
        
        const totalPages = Math.ceil(totalItems / this._rowsPerPage);
        const start = (this._currentPage - 1) * this._rowsPerPage + 1;
        const end = Math.min(this._currentPage * this._rowsPerPage, totalItems);
        
        paginationInfo.textContent = totalItems > 0 
            ? `Mostrando ${start}-${end} de ${totalItems} resultados`
            : 'No hay resultados';
        
        paginationControls.innerHTML = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '←';
        prevBtn.disabled = this._currentPage === 1;
        prevBtn.addEventListener('click', () => this._goToPage(this._currentPage - 1));
        paginationControls.appendChild(prevBtn);
        
        // Page buttons
        const startPage = Math.max(1, this._currentPage - 2);
        const endPage = Math.min(totalPages, this._currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === this._currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this._goToPage(i));
            paginationControls.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = '→';
        nextBtn.disabled = this._currentPage === totalPages || totalPages === 0;
        nextBtn.addEventListener('click', () => this._goToPage(this._currentPage + 1));
        paginationControls.appendChild(nextBtn);
    }

    _goToPage(page) {
        this._currentPage = page;
        this._render();
    }

    static get observedAttributes() {
        return ['title', 'show-pagination', 'rows-per-page', 'striped', 'hover', 'compact'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.shadowRoot && oldValue !== newValue) {
            if (name === 'rows-per-page') {
                this._rowsPerPage = parseInt(newValue) || 10;
                this._render();
            }
        }
    }
}

customElements.define('data-table', DataTable);
