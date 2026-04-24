/**
 * Compatibility Layer for Web Components
 * Asegura que la lógica JavaScript existente funcione con los nuevos componentes
 */
(function() {
    'use strict';

    // Función para sincronizar elementos entre Shadow DOM y DOM principal
    function syncShadowElement(shadowSelector, mainSelector) {
        const shadowEl = document.querySelector(shadowSelector);
        const mainEl = document.querySelector(mainSelector);
        
        if (shadowEl && mainEl) {
            // Sincronizar contenido inicial
            if (shadowEl.textContent !== mainEl.textContent) {
                shadowEl.textContent = mainEl.textContent;
            }
            
            // Observer para cambios futuros
            const observer = new MutationObserver(() => {
                shadowEl.textContent = mainEl.textContent;
            });
            
            observer.observe(mainEl, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
        }
    }

    // Función para asegurar que los elementos de tabla sean accesibles para DataTables
    function ensureTableAccessibility(tableId) {
        const shadowTable = document.querySelector(`app-table[table-id="${tableId}"]`);
        if (shadowTable) {
            const table = shadowTable.getTableElement();
            if (table && !document.getElementById(tableId)) {
                // Crear referencia en el DOM principal si no existe
                const clonedTable = table.cloneNode(true);
                clonedTable.id = tableId;
                clonedTable.style.display = 'none';
                document.body.appendChild(clonedTable);
                
                // Sincronizar cambios
                const tbody = table.querySelector('tbody');
                const clonedTbody = clonedTable.querySelector('tbody');
                
                if (tbody && clonedTbody) {
                    const observer = new MutationObserver(() => {
                        clonedTbody.innerHTML = tbody.innerHTML;
                    });
                    
                    observer.observe(tbody, { 
                        childList: true, 
                        characterData: true, 
                        subtree: true 
                    });
                }
            }
        }
    }

    // Función para mantener compatibilidad con eventos de tabs
    function ensureTabCompatibility() {
        // Mantener la funcionalidad original de tabs si existe
        if (typeof window.initTabs === 'function') {
            // Esperar a que los componentes estén cargados
            setTimeout(() => {
                window.initTabs();
            }, 100);
        }
    }

    // Función para sincronizar user-display-name
    function syncUserDisplay() {
        syncShadowElement('app-header #user-display-name', '#user-display-name');
    }

    // Función para sincronizar api-status
    function syncApiStatus() {
        syncShadowElement('app-footer #api-status', '#api-status');
    }

    // Inicializar cuando el DOM esté listo
    function initializeCompatibility() {
        // Sincronizar elementos dinámicos
        syncUserDisplay();
        syncApiStatus();
        
        // Asegurar compatibilidad de tablas
        const tableIds = [
            'dt-prof-clases', 'dt-admin-est', 'dt-admin-prof', 'dt-admin-adm',
            'dt-admin-horarios', 'dt-admin-reservas', 'dt-admin-historial'
        ];
        
        tableIds.forEach(tableId => {
            ensureTableAccessibility(tableId);
        });
        
        // Asegurar compatibilidad de tabs
        ensureTabCompatibility();
        
        // Mantener compatibilidad con panel-utils si existe
        if (typeof window.AppPanel !== 'undefined') {
            // Re-inicializar después de que los componentes se carguen
            setTimeout(() => {
                if (window.AppPanel.setHeaderName) {
                    window.AppPanel.setHeaderName();
                }
                if (window.AppPanel.pingApi) {
                    window.AppPanel.pingApi();
                }
            }, 200);
        }
    }

    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCompatibility);
    } else {
        initializeCompatibility();
    }

    // También inicializar después de que los Web Components se carguen
    window.addEventListener('load', () => {
        setTimeout(initializeCompatibility, 100);
    });

    // Exponer funciones para uso manual si es necesario
    window.WebComponentsCompatibility = {
        syncShadowElement,
        ensureTableAccessibility,
        syncUserDisplay,
        syncApiStatus
    };

})();
