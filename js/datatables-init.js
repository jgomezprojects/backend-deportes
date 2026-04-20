/**
 * Inicialización DataTables (requiere jQuery + DataTables cargados antes).
 */
(function (global) {
    const LANG_ES =
        "https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json";

    function destroyIfAny(tableSelector) {
        if (typeof jQuery === "undefined" || !jQuery.fn.dataTable) return;
        try {
            const $t = jQuery(tableSelector);
            if ($t.length && jQuery.fn.dataTable.isDataTable($t)) {
                $t.DataTable().destroy();
            }
        } catch (_) {
            /* noop */
        }
    }

    /**
     * @param {string} tableSelector e.g. '#dt-mis-notas'
     * @param {object} [extraOpts]
     */
    function initTable(tableSelector, extraOpts) {
        if (typeof jQuery === "undefined" || !jQuery.fn.dataTable) {
            return null;
        }
        const $t = jQuery(tableSelector);
        if (!$t.length) return null;
        destroyIfAny(tableSelector);
        return $t.DataTable(
            Object.assign(
                {
                    language: { url: LANG_ES },
                    responsive: true,
                    pageLength: 10,
                    order: [[0, "asc"]],
                    dom: '<"dt-toolbar"lf>rt<"dt-footer"ip>',
                },
                extraOpts || {}
            )
        );
    }

    global.DT = {
        initTable,
        destroyIfAny,
    };
})(window);
