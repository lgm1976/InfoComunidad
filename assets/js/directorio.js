/**
 * InfoComunidad - Directorio de Servicios
 * Lógica para búsqueda de profesionales usando Google Places API
 */

let service;

// Inicialización cuando la página carga
document.addEventListener('DOMContentLoaded', () => {
    // El mapa oculto es necesario para que el servicio de Places funcione
    const mapElement = document.getElementById('map');
    if (mapElement) {
        // Inicializamos el servicio de Google Places
        service = new google.maps.places.PlacesService(mapElement);
    }
});

/**
 * Función principal de búsqueda
 */
function searchPlaces() {
    const type = document.getElementById('serviceType').value;
    const location = document.getElementById('locationInput').value.trim();
    const resultsGrid = document.getElementById('resultsGrid');

    if (!location) {
        alert("Por favor, introduce una ubicación (Ciudad o CP).");
        return;
    }

    // 1. Detectamos si el usuario ha seleccionado una opción de urgencia
    // Esto busca si el valor contiene "24 horas" o "urgente"
    const esUrgencia = type.toLowerCase().includes('24 horas') || type.toLowerCase().includes('urgente');

    // Feedback visual
    resultsGrid.innerHTML = esUrgencia 
        ? '<p style="grid-column: 1/-1; text-align: center; color: #b91c1c; font-weight: bold;">🚨 Buscando servicios de emergencia abiertos ahora en ' + location + '...</p>'
        : '<p style="grid-column: 1/-1; text-align: center;">Buscando profesionales en ' + location + '...</p>';

    const request = {
        query: `${type} en ${location}`,
        fields: ['name', 'geometry', 'formatted_address', 'rating', 'user_ratings_total', 'place_id', 'opening_hours'],
        // 2. FILTRO CLAVE: Si es urgencia, solo muestra negocios abiertos YA.
        // Si no es urgencia, muestra todos (aunque estén cerrados ahora).
        openNow: esUrgencia 
    };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            renderizarResultados(results);
        } else {
            const mensajeError = esUrgencia 
                ? "No se han encontrado servicios de urgencia abiertos ahora en esta zona."
                : "No se encontraron resultados para esta búsqueda.";
            
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">${mensajeError}</p>`;
        }
    });
}

/**
 * Renderiza las tarjetas y solicita el teléfono de cada una
 */
function renderizarResultados(places) {
    const resultsGrid = document.getElementById('resultsGrid');
    resultsGrid.innerHTML = ''; 

    const MI_NEGOCIO_ID = "ChIJnYofDgwmQg0RYTGdt8CGi6I"; // ID de Brasero Gestión

    let miNegocio = places.find(p => p.place_id === MI_NEGOCIO_ID);
    let otrosNegocios = places.filter(p => p.place_id !== MI_NEGOCIO_ID);

    let listaFinal = miNegocio ? [miNegocio, ...otrosNegocios] : otrosNegocios;

    listaFinal.slice(0, 9).forEach((place, index) => {
        const card = document.createElement('article');
        card.className = 'place-card';
        
        // --- LÓGICA DE DETECCIÓN 24 HORAS ---
        // Comprobamos si Google indica que abre 24h o si el nombre lo sugiere
        const es24h = (place.opening_hours && place.opening_hours.periods && 
                       place.opening_hours.periods.length === 1 && 
                       place.opening_hours.periods[0].open.day === 0 && 
                       place.opening_hours.periods[0].open.time === "0000") || 
                       place.name.toLowerCase().includes('24h') || 
                       place.name.toLowerCase().includes('24 horas');

        const badge24h = es24h ? `<span class="badge-24h">⏱ Servicio 24h</span>` : '';
        // ------------------------------------

        const mapDivId = `mini-map-${place.place_id}`;
        
        card.innerHTML = `
    <div id="${mapDivId}" class="mini-map"></div>
    <div class="place-card-content"> 
        ${badge24h}
        <h3>${place.name}</h3>
        <div class="rating">
            ${'★'.repeat(Math.floor(place.rating || 0))} 
            <span>(${place.user_ratings_total || 0} reseñas)</span>
        </div>
        <p><strong>Dirección:</strong> ${place.formatted_address}</p>
        <p id="phone-${place.place_id}">
            📞 Cargando teléfono...
        </p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}" 
           target="_blank" class="btn-leer">Ver contacto completo</a>
    </div>
`;

        resultsGrid.appendChild(card);
        initMiniMap(mapDivId, place.geometry.location);
        
        setTimeout(() => {
            obtenerTelefono(place.place_id);
        }, index * 250);
    });
}

/**
 * Inicializa el mapa estático dentro de la tarjeta
 */
function initMiniMap(elementId, location) {
    new google.maps.Map(document.getElementById(elementId), {
        center: location,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: "none"
    });
    // Añadir marcador
    new google.maps.Marker({
        position: location,
        map: new google.maps.Map(document.getElementById(elementId), {
            center: location,
            zoom: 15,
            disableDefaultUI: true,
            gestureHandling: "none"
        })
    });
}

/**
 * Solicita específicamente el campo de teléfono de un lugar
 */
function obtenerTelefono(placeId) {
    const request = {
        placeId: placeId,
        fields: ['formatted_phone_number'] // Campo de contacto (capa de pago de Google)
    };

    service.getDetails(request, (place, status) => {
        const phoneElement = document.getElementById(`phone-${placeId}`);
        if (!phoneElement) return;

        if (status === google.maps.places.PlacesServiceStatus.OK && place.formatted_phone_number) {
            // Creamos link tel: para que sea accionable en móviles
            const cleanPhone = place.formatted_phone_number.replace(/\s+/g, '');
            phoneElement.innerHTML = `📞 <a href="tel:${cleanPhone}" style="color: inherit; text-decoration: none;">${place.formatted_phone_number}</a>`;
        } else {
            phoneElement.innerText = "📞 Teléfono no disponible";
            phoneElement.style.color = "#999";
        }
    });
}