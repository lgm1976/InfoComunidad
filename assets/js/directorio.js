/**
 * InfoComunidad - Directorio de Servicios
 * Lógica para búsqueda de profesionales usando Google Places API
 */

let map, service, infowindow, geocoder;

/**
 * Inicialización del mapa. Esta función es llamada por el script de Google Maps
 * gracias al parámetro `callback=initMap` en el HTML.
 */
function initMap() {
    const defaultLocation = { lat: 40.416775, lng: -3.703790 }; // Centro de Madrid
    // [CORREGIDO] Se ha eliminado el "new" duplicado
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 12,
    });
    infowindow = new google.maps.InfoWindow();
    service = new google.maps.places.PlacesService(map);
    geocoder = new google.maps.Geocoder(); // [NUEVO] Inicializamos el Geocoder
}

/**
 * Función principal de búsqueda, llamada por el botón "Buscar"
 */
function searchPlaces() {
    const type = document.getElementById('serviceType').value;
    const locationInput = document.getElementById('locationInput');
    
    if (locationInput.value.trim() === '') {
        locationInput.value = "Madrid";
    }
    const locationQuery = locationInput.value;
    const resultsGrid = document.getElementById('resultsGrid');

    resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Localizando "${locationQuery}" en España...</p>`;

    // --- [NUEVO] Búsqueda en dos pasos ---
    // 1. Convertir la ubicación de texto a coordenadas (solo en España)
    geocoder.geocode({ 'address': locationQuery, 'componentRestrictions': { 'country': 'ES' } }, (results, status) => {
        if (status === 'OK') {
            const searchLocation = results[0].geometry.location;
            map.setCenter(searchLocation);
            map.setZoom(13);

            const esUrgencia = type.toLowerCase().includes('24 horas') || type.toLowerCase().includes('urgente');
            
            resultsGrid.innerHTML = esUrgencia 
                ? `<p style="grid-column: 1/-1; text-align: center; color: #b91c1c; font-weight: bold;">🚨 Buscando servicios de emergencia abiertos cerca de ${results[0].formatted_address}...</p>`
                : `<p style="grid-column: 1/-1; text-align: center;">Buscando profesionales cerca de ${results[0].formatted_address}...</p>`;

            // 2. Realizar una búsqueda por proximidad (nearbySearch)
            const request = {
                location: searchLocation,
                radius: 10000, // Radio de 10km
                keyword: type,
                openNow: esUrgencia
            };

            service.nearbySearch(request, (places, searchStatus) => {
                if (searchStatus === google.maps.places.PlacesServiceStatus.OK && places && places.length > 0) {
                    renderizarResultados(places);
                } else {
                    const mensajeError = esUrgencia 
                        ? "No se han encontrado servicios de urgencia abiertos ahora en esta zona."
                        : "No se encontraron resultados para esta búsqueda.";
                    resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">${mensajeError}</p>`;
                }
            });

        } else {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #b91c1c;">No se pudo encontrar la ubicación "${locationQuery}" en España. Por favor, sea más específico.</p>`;
        }
    });
}

/**
 * Renderiza las tarjetas y solicita el teléfono de cada una
 */
function renderizarResultados(places) {
    const resultsGrid = document.getElementById('resultsGrid');
    resultsGrid.innerHTML = ''; 

    // [MODIFICADO] La búsqueda por proximidad devuelve 'vicinity' en lugar de 'formatted_address'
    // Lo normalizamos aquí para no tener que cambiar el resto del código.
    places.forEach(p => {
        if (!p.formatted_address) {
            p.formatted_address = p.vicinity;
        }
    });

    const MI_NEGOCIO_ID = "ChIJnYofDgwmQg0RYTGdt8CGi6I";
    let miNegocio = places.find(p => p.place_id === MI_NEGOCIO_ID);
    let otrosNegocios = places.filter(p => p.place_id !== MI_NEGOCIO_ID);

    const isUrgent = (place) => {
        if (!place || !place.name) return false;
        const placeNameLower = place.name.toLowerCase();
        return (place.opening_hours && place.opening_hours.periods && place.opening_hours.periods.length === 1 && place.opening_hours.periods[0].open.day === 0 && place.opening_hours.periods[0].open.time === "0000") || 
               placeNameLower.includes('24h') || placeNameLower.includes('24 horas') ||
               placeNameLower.includes('urgente') || placeNameLower.includes('urgencias') ||
               placeNameLower.includes('24/7') || placeNameLower.includes('festivos');
    };

    const urgentPlaces = otrosNegocios.filter(isUrgent);
    const regularPlaces = otrosNegocios.filter(p => !isUrgent(p));

    const listaFinal = [
        ...(miNegocio ? [miNegocio] : []),
        ...urgentPlaces,
        ...regularPlaces
    ];

    listaFinal.slice(0, 9).forEach((place, index) => {
        const card = document.createElement('article');
        card.className = 'place-card';
        const badge24h = isUrgent(place) ? `<span class="badge-24h">⏱ Servicio 24h</span>` : '';
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
        <p id="phone-${place.place_id}">📞 Cargando teléfono...</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}" target="_blank" class="btn-leer">Ver contacto completo</a>
    </div>`;

        resultsGrid.appendChild(card);
        initMiniMap(mapDivId, place.geometry.location);
        
        setTimeout(() => obtenerTelefono(place.place_id), index * 250);
    });
}

/**
 * Inicializa el mapa estático dentro de la tarjeta
 */
function initMiniMap(elementId, location) {
    const mapElement = document.getElementById(elementId);
    if (!mapElement) return;
    const miniMap = new google.maps.Map(mapElement, {
        center: location,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: "none"
    });
    new google.maps.Marker({ position: location, map: miniMap });
}

/**
 * Solicita específicamente el campo de teléfono de un lugar
 */
function obtenerTelefono(placeId) {
    const request = { placeId: placeId, fields: ['formatted_phone_number'] };
    service.getDetails(request, (place, status) => {
        const phoneElement = document.getElementById(`phone-${placeId}`);
        if (!phoneElement) return;
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.formatted_phone_number) {
            const cleanPhone = place.formatted_phone_number.replace(/\s+/g, '');
            phoneElement.innerHTML = `📞 <a href="tel:${cleanPhone}" style="color: inherit; text-decoration: none;">${place.formatted_phone_number}</a>`;
        } else {
            phoneElement.innerText = "📞 Teléfono no disponible";
            phoneElement.style.color = "#999";
        }
    });
}