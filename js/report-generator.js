/**
 * Generador de Reportes PDF
 * Funcionalidad para generar reportes personalizados con múltiples filtros
 */

class ReportGenerator {
    constructor() {
        this.apiBase = "https://backend-deportes-production-0925.up.railway.app";
        this.currentReportData = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDateDefaults();
    }

    bindEvents() {
        // Event listeners para el formulario de reportes
        const btnGenerar = document.getElementById('btn-generar-reporte');
        const btnVistaPrevia = document.getElementById('btn-vista-previa');
        const btnDescargar = document.getElementById('btn-descargar-reporte');

        if (btnGenerar) {
            btnGenerar.addEventListener('click', () => this.generarReporte());
        }

        if (btnVistaPrevia) {
            btnVistaPrevia.addEventListener('click', () => this.generarVistaPrevia());
        }

        if (btnDescargar) {
            btnDescargar.addEventListener('click', () => this.descargarReporte());
        }

        // Validación de fechas
        const fechaInicio = document.getElementById('reporte-fecha-inicio');
        const fechaFin = document.getElementById('reporte-fecha-fin');

        if (fechaInicio && fechaFin) {
            fechaInicio.addEventListener('change', () => this.validateDates());
            fechaFin.addEventListener('change', () => this.validateDates());
        }
    }

    setupDateDefaults() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const fechaInicio = document.getElementById('reporte-fecha-inicio');
        const fechaFin = document.getElementById('reporte-fecha-fin');

        if (fechaInicio) {
            fechaInicio.value = this.formatDate(thirtyDaysAgo);
        }
        if (fechaFin) {
            fechaFin.value = this.formatDate(today);
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    validateDates() {
        const fechaInicio = document.getElementById('reporte-fecha-inicio');
        const fechaFin = document.getElementById('reporte-fecha-fin');
        
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio.value);
            const fin = new Date(fechaFin.value);
            
            if (inicio > fin) {
                this.showMessage('La fecha de inicio no puede ser posterior a la fecha fin', 'error');
                fechaFin.value = this.formatDate(inicio);
            }
        }
    }

    async generarReporte() {
        try {
            this.showLoading(true);
            const reportData = this.collectFormData();
            
            // Validar datos
            if (!this.validateReportData(reportData)) {
                this.showLoading(false);
                return;
            }

            // Simular generación de reporte (en producción, esto llamaría al backend)
            await this.simulateReportGeneration(reportData);
            
            // Mostrar vista previa
            this.showReportPreview(reportData);
            
            // Habilitar descarga
            this.currentReportData = reportData;
            
            this.showMessage('Reporte generado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error generando reporte:', error);
            this.showMessage('Error al generar el reporte. Por favor, intente nuevamente.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generarVistaPrevia() {
        try {
            this.showLoading(true);
            const reportData = this.collectFormData();
            
            if (!this.validateReportData(reportData)) {
                this.showLoading(false);
                return;
            }

            // Generar vista previa simplificada
            this.showReportPreview(reportData);
            
            this.showMessage('Vista previa generada', 'success');
            
        } catch (error) {
            console.error('Error generando vista previa:', error);
            this.showMessage('Error al generar la vista previa', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        return {
            tipo: document.getElementById('reporte-tipo')?.value || '',
            fechaInicio: document.getElementById('reporte-fecha-inicio')?.value || '',
            fechaFin: document.getElementById('reporte-fecha-fin')?.value || '',
            rol: document.getElementById('reporte-rol')?.value || 'todos',
            deporte: document.getElementById('reporte-deporte')?.value || 'todos',
            formato: document.getElementById('reporte-formato')?.value || 'pdf'
        };
    }

    validateReportData(data) {
        if (!data.tipo) {
            this.showMessage('Por favor, selecciona un tipo de reporte', 'error');
            return false;
        }
        
        if (!data.fechaInicio || !data.fechaFin) {
            this.showMessage('Por favor, selecciona un rango de fechas', 'error');
            return false;
        }
        
        return true;
    }

    async simulateReportGeneration(data) {
        // Simular delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simular datos de reporte según el tipo
        const mockData = this.generateMockData(data);
        this.currentReportData = { ...data, mockData };
    }

    generateMockData(data) {
        const baseData = {
            usuarios: [
                { nombre: 'Juan Pérez', rol: 'Estudiante', deporte: 'Fútbol', asistencia: '95%' },
                { nombre: 'María García', rol: 'Estudiante', deporte: 'Basketball', asistencia: '88%' },
                { nombre: 'Carlos López', rol: 'Profesor', deporte: 'Voleibol', clases: 12 },
                { nombre: 'Ana Martínez', rol: 'Profesor', deporte: 'Tenis', clases: 8 }
            ],
            inscripciones: [
                { actividad: 'Fútbol', inscritos: 45, cupos: 50, porcentaje: '90%' },
                { actividad: 'Basketball', inscritos: 32, cupos: 40, porcentaje: '80%' },
                { actividad: 'Voleibol', inscritos: 28, cupos: 35, porcentaje: '80%' }
            ],
            asistencia: [
                { fecha: '2024-01-15', actividad: 'Fútbol', presentes: 42, ausentes: 3 },
                { fecha: '2024-01-15', actividad: 'Basketball', presentes: 30, ausentes: 2 },
                { fecha: '2024-01-16', actividad: 'Voleibol', presentes: 26, ausentes: 2 }
            ],
            rendimiento: [
                { estudiante: 'Juan Pérez', deporte: 'Fútbol', nota: 8.5, bloque: 1 },
                { estudiante: 'María García', deporte: 'Basketball', nota: 9.2, bloque: 1 },
                { estudiante: 'Carlos López', deporte: 'Voleibol', nota: 7.8, bloque: 2 }
            ]
        };

        return baseData[data.tipo] || baseData.usuarios;
    }

    showReportPreview(data) {
        const previewContainer = document.getElementById('reporte-preview');
        const previewContent = document.getElementById('reporte-preview-content');
        
        if (previewContainer && previewContent) {
            previewContainer.hidden = false;
            
            // Generar HTML de vista previa
            const previewHTML = this.generatePreviewHTML(data);
            previewContent.innerHTML = previewHTML;
            
            // Scroll al preview
            previewContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    generatePreviewHTML(data) {
        const reportTitles = {
            usuarios: 'Reporte de Usuarios',
            inscripciones: 'Reporte de Inscripciones',
            asistencia: 'Reporte de Asistencia',
            rendimiento: 'Reporte de Rendimiento Académico'
        };

        const title = reportTitles[data.tipo] || 'Reporte';
        const mockData = this.currentReportData?.mockData || [];

        let html = `
            <div class="report-preview-header">
                <h2>${title}</h2>
                <div class="report-meta">
                    <p><strong>Período:</strong> ${this.formatDateDisplay(data.fechaInicio)} - ${this.formatDateDisplay(data.fechaFin)}</p>
                    <p><strong>Filtros:</strong> ${this.getFiltersDescription(data)}</p>
                    <p><strong>Generado:</strong> ${new Date().toLocaleString()}</p>
                </div>
            </div>
            <div class="report-content">
                <table class="preview-table">
                    <thead>
                        <tr>
                            ${this.getTableHeaders(data.tipo)}
                        </tr>
                    </thead>
                    <tbody>
                        ${mockData.map(row => this.generateTableRow(row, data.tipo)).join('')}
                    </tbody>
                </table>
            </div>
            <div class="report-summary">
                <p><strong>Total de registros:</strong> ${mockData.length}</p>
                <p><strong>Formato:</strong> ${data.formato.toUpperCase()}</p>
            </div>
        `;

        return html;
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    getFiltersDescription(data) {
        const filters = [];
        
        if (data.rol !== 'todos') {
            const roles = { '1': 'Estudiantes', '2': 'Profesores', '3': 'Administradores' };
            filters.push(roles[data.rol] || data.rol);
        }
        
        if (data.deporte !== 'todos') {
            filters.push(data.deporte.charAt(0).toUpperCase() + data.deporte.slice(1));
        }
        
        return filters.length > 0 ? filters.join(', ') : 'Todos';
    }

    getTableHeaders(tipo) {
        const headers = {
            usuarios: '<th>Nombre</th><th>Rol</th><th>Deporte</th><th>Detalle</th>',
            inscripciones: '<th>Actividad</th><th>Inscritos</th><th>Cupos</th><th>Ocupación</th>',
            asistencia: '<th>Fecha</th><th>Actividad</th><th>Presentes</th><th>Ausentes</th>',
            rendimiento: '<th>Estudiante</th><th>Deporte</th><th>Nota</th><th>Bloque</th>'
        };
        
        return headers[tipo] || '<th>Dato</th>';
    }

    generateTableRow(row, tipo) {
        switch (tipo) {
            case 'usuarios':
                return `<tr>
                    <td>${row.nombre}</td>
                    <td>${row.rol}</td>
                    <td>${row.deporte}</td>
                    <td>${row.asistencia || row.clases + ' clases'}</td>
                </tr>`;
            
            case 'inscripciones':
                return `<tr>
                    <td>${row.actividad}</td>
                    <td>${row.inscritos}</td>
                    <td>${row.cupos}</td>
                    <td>${row.porcentaje}</td>
                </tr>`;
            
            case 'asistencia':
                return `<tr>
                    <td>${row.fecha}</td>
                    <td>${row.actividad}</td>
                    <td>${row.presentes}</td>
                    <td>${row.ausentes}</td>
                </tr>`;
            
            case 'rendimiento':
                return `<tr>
                    <td>${row.estudiante}</td>
                    <td>${row.deporte}</td>
                    <td>${row.nota}</td>
                    <td>${row.bloque}</td>
                </tr>`;
            
            default:
                return `<tr><td>${JSON.stringify(row)}</td></tr>`;
        }
    }

    descargarReporte() {
        if (!this.currentReportData) {
            this.showMessage('No hay reporte generado para descargar', 'error');
            return;
        }

        try {
            // Simular descarga de PDF
            this.simulatePDFDownload(this.currentReportData);
            this.showMessage('Reporte descargado exitosamente', 'success');
        } catch (error) {
            console.error('Error descargando reporte:', error);
            this.showMessage('Error al descargar el reporte', 'error');
        }
    }

    simulatePDFDownload(data) {
        // Crear un blob PDF simulado
        const pdfContent = this.generatePDFContent(data);
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        
        // Crear URL y descargar
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${data.tipo}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generatePDFContent(data) {
        // Contenido PDF simulado (en producción, esto vendría del backend)
        return `%PDF-1.4
1 0 obj
<<
/Title (${data.tipo} Report)
/Creator (Deportes Universidad System)
/Producer (Report Generator v1.0)
/CreationDate (D:${new Date().toISOString()})
>>
endobj

2 0 obj
<<
/Type /Catalog
/Pages 3 0 R
>>
endobj

3 0 obj
<<
/Type /Pages
/Kids [4 0 R]
/Count 1
>>
endobj

4 0 obj
<<
/Type /Page
/Parent 3 0 R
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

5 0 obj
<<
/Length ${data.mockData.length * 100}
>>
stream
BT
/F1 12 Tf
72 720 Td
(Reporte de ${data.tipo}) Tj
0 -14 Td
(Período: ${data.fechaInicio} - ${data.fechaFin}) Tj
0 -14 Td
(Generado: ${new Date().toLocaleString()}) Tj
0 -20 Td
${data.mockData.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`).join(' 0 -14 Td ')} Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000054 00000 n 
0000000115 00000 n 
0000000166 00000 n 
0000000255 00000 n 
trailer
<<
/Size 6
/Root 2 0 R
>>
startxref
%%EOF`;
    }

    showLoading(show) {
        const btnGenerar = document.getElementById('btn-generar-reporte');
        const btnVistaPrevia = document.getElementById('btn-vista-previa');
        
        if (btnGenerar) {
            btnGenerar.disabled = show;
            btnGenerar.textContent = show ? '⏳ Generando...' : '📊 Generar Reporte';
        }
        
        if (btnVistaPrevia) {
            btnVistaPrevia.disabled = show;
            btnVistaPrevia.textContent = show ? '⏳ Procesando...' : '👁️ Vista Previa';
        }
    }

    showMessage(message, type) {
        // Usar el sistema de mensajes existente si está disponible
        if (typeof window.AppPanel !== 'undefined' && window.AppPanel.showFlash) {
            window.AppPanel.showFlash(message, type === 'error' ? 'err' : 'ok');
        } else {
            // Fallback: mostrar mensaje simple
            const existingFlash = document.getElementById('flash-msg');
            if (existingFlash) {
                existingFlash.textContent = message;
                existingFlash.hidden = false;
                existingFlash.className = `flash flash--${type === 'error' ? 'err' : 'ok'}`;
                
                setTimeout(() => {
                    existingFlash.hidden = true;
                }, 5000);
            } else {
                alert(message);
            }
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reporte-form')) {
        window.reportGenerator = new ReportGenerator();
    }
});
