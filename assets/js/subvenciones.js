document.addEventListener('DOMContentLoaded', () => {
    const municipioSelect = document.getElementById('municipio-select');
    const searchBtn = document.getElementById('search-btn');
    const resultsContainer = document.getElementById('results-container');
    const noResults = document.getElementById('no-results');
    let subvenciones = [];
    let municipioChoices;

    // Inicializar Choices.js para el desplegable de municipios
    municipioChoices = new Choices(municipioSelect, {
        searchEnabled: true,
        itemSelectText: 'Seleccionar',
        placeholderValue: 'Todos los municipios',
        removeItemButton: true,
        allowHTML: false,
        searchPlaceholderValue: 'Escribe para filtrar...'
    });

    // 1. Cargar datos del JSON nuevo (generado por Python)
    fetch('assets/data/subvenciones.json')
        .then(response => response.json())
        .then(data => {
            subvenciones = data;
            populateMunicipios(data);
        })
        .catch(error => {
            console.error('Error al cargar las subvenciones:', error);
            resultsContainer.innerHTML = '<p>Error al cargar la información. Por favor, inténtalo más tarde.</p>';
        });

    // 2. Rellenar el desplegable de municipios con Choices.js
    function populateMunicipios(data) {
        // Obtenemos municipios únicos del campo 'municipio'
        const municipios = [...new Set(data.map(item => item.municipio))].filter(Boolean);
        municipios.sort(); // Ordenar alfabéticamente
        
        const choices = [{ value: '', label: 'Todos los municipios', selected: true }];
        
        // Evitamos añadir 'Todos' si ya viene en los datos para no duplicar
        municipios.forEach(municipio => {
            if(municipio !== 'Todos') {
                choices.push({
                    value: municipio,
                    label: municipio
                });
            }
        });

        municipioChoices.setChoices(choices, 'value', 'label', true); // 'true' reemplaza las opciones existentes
    }

    // 3. Mostrar los resultados en tarjetas
    function displayResults(data) {
        resultsContainer.innerHTML = '';
        noResults.style.display = data.length === 0 ? 'block' : 'none';

        data.forEach(subvencion => {
            const card = document.createElement('article');
            card.className = 'guia-card';

            // Formatear tags como HTML
            const tagsHtml = subvencion.tags ? 
                `<div class="subvencion-tags">${subvencion.tags.map(tag => `<span>${tag}</span>`).join('')}</div>` : '';

            card.innerHTML = `
                <div class="guia-card-content">
                    <div class="subvencion-header">
                        <span class="subvencion-ambito">${subvencion.ambito || 'General'}</span>
                    </div>
                    <h3>${subvencion.titulo}</h3>
                    <p class="subvencion-municipio"><strong>Municipio:</strong> ${subvencion.municipio}</p>
                    <p><strong>Organismo:</strong> ${subvencion.organo}</p>
                    ${tagsHtml}
                </div>
                <div class="guia-card-footer">
                    <p class="subvencion-fecha"><strong>Importe:</strong> ${subvencion.importe || 'Consultar'}</p>
                    <a href="${subvencion.url}" target="_blank" class="btn-leer">Ver Convocatoria Oficial →</a>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }

    // 4. Lógica de búsqueda
    function handleSearch() {
        const municipioSeleccionado = municipioChoices.getValue(true);
        
        const filteredData = subvenciones.filter(subvencion => {
            // Filtramos por municipio
            // Si el municipio seleccionado es vacío, mostramos todo
            if (!municipioSeleccionado || municipioSeleccionado === '') return true;
            
            // Si la subvención es para "Todos" los municipios o "Nacional", también la mostramos siempre
            if (subvencion.municipio === 'Todos' || subvencion.region === 'Nacional') return true;

            return subvencion.municipio === municipioSeleccionado;
        });

        displayResults(filteredData);
    }

    searchBtn.addEventListener('click', handleSearch);
});
