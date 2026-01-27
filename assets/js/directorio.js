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

    // Feedback visual de carga
    resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Buscando los mejores profesionales en ' + location + '...</p>';

    const request = {
        query: `${type} en ${location}`,
        // Campos básicos para la primera búsqueda (no incluye teléfono por restricciones de Google)
        fields: ['name', 'geometry', 'formatted_address', 'rating', 'user_ratings_total', 'place_id']
    };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            renderizarResultados(results);
        } else {
            console.error("Error en la búsqueda:", status);
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">No se encontraron resultados o hay un problema con la clave API (${status}).</p>`;
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

    // 1. Identificar si nuestro negocio está en la lista de resultados
    let miNegocio = places.find(p => p.place_id === MI_NEGOCIO_ID);
    
    // 2. Crear una lista nueva sin nuestro negocio (para que no salga duplicado)
    let otrosNegocios = places.filter(p => p.place_id !== MI_NEGOCIO_ID);

    // 3. Crear la lista final: Mi negocio primero, luego los demás
    let listaFinal = [];
    if (miNegocio) {
        listaFinal = [miNegocio, ...otrosNegocios];
    } else {
        // Si Google NO lo encontró en esta búsqueda, lo dejamos como estaba
        // (Opcional: Podríamos forzar su carga aquí, pero requiere otra llamada a API)
        listaFinal = otrosNegocios;
    }

    // 4. Renderizar la lista final (máximo 9)
    listaFinal.slice(0, 9).forEach((place, index) => {
        const card = document.createElement('article');
        card.className = 'place-card';
        
        // OPCIONAL: Añadir un estilo especial si es el nuestro
    /*    if (place.place_id === MI_NEGOCIO_ID) {
            card.style.border = "2px solid var(--primary)";
            card.innerHTML = `<span style="background: var(--primary); color:white; padding:2px 10px; font-size:10px; border-radius:3px; align-self:start; margin-bottom:10px;">RECOMENDADO</span>`;
        }
     */
        const mapDivId = `mini-map-${place.place_id}`;
        
        // El resto del innerHTML se mantiene igual que antes...
        card.innerHTML += `
            <div id="${mapDivId}" class="mini-map"></div>
            <h3>${place.name}</h3>
            <div class="rating">
                ${'★'.repeat(Math.floor(place.rating || 0))} 
                <span>(${place.user_ratings_total || 0} reseñas)</span>
            </div>
            <p><strong>Dirección:</strong> ${place.formatted_address}</p>
            <p id="phone-${place.place_id}" style="color: var(--primary); font-weight: bold; margin-bottom: 15px;">
                📞 Cargando teléfono...
            </p>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}" 
               target="_blank" class="btn-leer">Ver contacto completo</a>
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