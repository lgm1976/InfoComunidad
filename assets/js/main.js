/*** InfoComunidad - JavaScript Centralizado v2.0  ***/

 document.addEventListener('DOMContentLoaded', () => {
    loadHeader(); // <-- Llamamos a la función al cargar
    loadFooter(); // <-- Llamamos a la función al cargar
});

/* ==========================================
   SECCIÓN: HEADER
   ========================================== */

function getRelativePath() {
    const path = window.location.pathname;
    // Si estamos en una subcarpeta (ej: /guias/articulo.html), necesitamos ../
    // Contamos las barras inclinadas después de la raíz del proyecto
    const depth = (path.match(/\//g) || []).length;
    
    // Si estás en GitHub Pages (ej: /InfoComunidad/guias/articulo.html), 
    // la profundidad suele ser 2 o más. 
    // Ajustamos para que funcione tanto en local como en GitHub.
    if (path.includes('github.io')) {
        return depth > 2 ? '../' : '';
    }
    return depth > 1 ? '../' : '';
}

function loadHeader() {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;

    const prefix = getRelativePath();
    
    fetch(`${prefix}assets/components/header.html`)
        .then(response => response.text())
        .then(data => {
            // Ajustamos las rutas de las imágenes dentro del HTML cargado
            headerElement.innerHTML = data.replace(/src="assets\//g, `src="${prefix}assets/`);
            
            initMobileMenu();
            initScrollSpy();
        })
        .catch(err => console.error("Error cargando el header:", err));
}

function initScrollSpy() {
    // Solo ejecutamos esto si estamos en la página index (donde están las secciones)
    if (!document.querySelector('#servicios')) return;

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('#navMenu a');

    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.6 // Se activa cuando el 60% de la sección es visible
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    // Comprobamos si el href del enlace coincide con el id de la sección
                    if (link.getAttribute('href').includes(entry.target.id)) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, options);

    sections.forEach(section => observer.observe(section));
}

/* ==========================================
    SECCIÓN: FOOTER
    ========================================== */

    function loadFooter() {
    const footerElement = document.querySelector('footer');
    if (!footerElement) return;

    const prefix = getRelativePath();

    fetch(`${prefix}assets/components/footer.html`)
        .then(response => response.text())
        .then(data => {
            footerElement.innerHTML = data;
        })
        .catch(err => console.error("Error cargando el footer:", err));
}

// --- VARIABLES GLOBALES DEL COTIZADOR ---
let autocomplete, map, marker;
let direccionSeleccionada = {
    direccionCompleta: "", calle: "", numero: "", ciudad: "", provincia: "", codigoPostal: ""
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. LÓGICA COMÚN (Menú)
    initMobileMenu();

    // 2. LÓGICA DE INDEX (Carrusel)
    if (document.querySelector('.carousel-track')) {
        initCarousel();
    }

    // 3. LÓGICA DEL COTIZADOR (Pasos)
    if (document.getElementById('step-1')) {
        irAlPaso(1);
    }
});

/* ==========================================
   SECCIÓN: COMÚN & MENÚ
   ========================================== */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    if (!menuToggle || !navMenu) return;

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('open');
    });

    document.querySelectorAll('#navMenu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('open');
        });
    });
}

/* ==========================================
   SECCIÓN: INDEX (Carrusel)
   ========================================== */
function initCarousel() {
    const track = document.querySelector('.carousel-track');
    const items = Array.from(document.querySelectorAll('.carousel-item'));
    const prev = document.querySelector('.carousel-btn.prev');
    const next = document.querySelector('.carousel-btn.next');

    const visible = window.innerWidth < 768 ? 1 : 3;
    let index = visible;

    const clonesBefore = items.slice(-visible).map(el => el.cloneNode(true));
    const clonesAfter = items.slice(0, visible).map(el => el.cloneNode(true));
    clonesBefore.forEach(clone => track.prepend(clone));
    clonesAfter.forEach(clone => track.append(clone));

    const allItems = Array.from(track.children);
    const getWidth = () => allItems[0].offsetWidth;

    const move = (animate = true) => {
        track.style.transition = animate ? 'transform .4s ease' : 'none';
        track.style.transform = `translateX(-${index * getWidth()}px)`;
    };

    move(false);

    next.addEventListener('click', () => {
        index++;
        move(true);
        if (index === allItems.length - visible) {
            setTimeout(() => { index = visible; move(false); }, 400);
        }
    });

    prev.addEventListener('click', () => {
        index--;
        move(true);
        if (index === 0) {
            setTimeout(() => { index = allItems.length - (visible * 2); move(false); }, 400);
        }
    });

    window.addEventListener('resize', () => move(false));
}

/* ==========================================
   SECCIÓN: COTIZADOR (Lógica de Negocio)
   ========================================== */

// Google Maps & Autocomplete
function initAutocomplete() {
    const input = document.getElementById('direccion');
    if (!input || typeof google === 'undefined') return;

    try {
        autocomplete = new google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: "es" },
            fields: ["address_components", "geometry", "formatted_address"],
            types: ["address"]
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) return;

            direccionSeleccionada.direccionCompleta = place.formatted_address;
            place.address_components.forEach(c => {
                const type = c.types[0];
                if (type === "route") direccionSeleccionada.calle = c.long_name;
                if (type === "street_number") direccionSeleccionada.numero = c.long_name;
                if (type === "locality") direccionSeleccionada.ciudad = c.long_name;
                if (type === "administrative_area_level_2") direccionSeleccionada.provincia = c.long_name;
                if (type === "postal_code") direccionSeleccionada.codigoPostal = c.long_name;
            });

            const mapDiv = document.getElementById('map');
            if (mapDiv) {
                mapDiv.style.display = 'block';
                if (!map) {
                    map = new google.maps.Map(mapDiv, { zoom: 17, center: place.geometry.location, disableDefaultUI: true });
                    marker = new google.maps.Marker({ map: map });
                }
                map.setCenter(place.geometry.location);
                marker.setPosition(place.geometry.location);
            }
        });
    } catch (e) {
        console.warn("Autocompletado no disponible.");
    }
}

function gm_authFailure() { 
    const msg = document.getElementById('api-warning-msg');
    if(msg) msg.style.display = 'block';
    const dirInput = document.getElementById('direccion');
    if(dirInput) dirInput.placeholder = "Escriba la dirección manualmente...";
}

// Navegación Multistep
function irAlPaso(n) {
    const steps = document.querySelectorAll('.step');
    const progressFill = document.getElementById('progress');
    
    steps.forEach(s => s.classList.remove('active'));
    const nextStep = document.getElementById('step-' + n);
    if (nextStep) nextStep.classList.add('active');

    if (progressFill) {
        const percent = Math.round(((n - 1) / (steps.length - 1)) * 100);
        progressFill.style.width = percent + '%';
        progressFill.setAttribute('data-progress', percent + '%');
    }

    if (n === 2 && map) {
        setTimeout(() => {
            google.maps.event.trigger(map, "resize");
            if (marker) map.setCenter(marker.getPosition());
        }, 100);
    }
    window.scrollTo(0,0);
}

// Validaciones y Cálculo
function validarPaso1() {
    const nom = document.getElementById('nombre').value;
    const ape = document.getElementById('apellidos').value;
    const tel = document.getElementById('telefono').value;
    const mail = document.getElementById('email').value;
    const legal = document.getElementById('legal_consent').checked;

    if(!nom || !ape || !tel || !mail) {
        alert("Por favor, rellena todos los campos de contacto.");
        return;
    }
    if(!legal) {
        alert("Debe aceptar las bases legales y la cesión de datos para continuar.");
        return;
    }
    irAlPaso(2);
}

function calcularYMostrar() {
    const v = parseInt(document.getElementById('viviendas').value) || 0;
    const portales = parseInt(document.getElementById('portales').value) || 0;
    const asc = parseInt(document.getElementById('ascensores').value) || 0;
    const ano = parseInt(document.getElementById('anoConstruccion').value) || 2000;
    const motivo = document.getElementById('motivo').value;
    
    let total = 50; 
    total += (v * 3); 
    total += (portales * 10);
    total += (asc * 12); 

    if (ano < 1980) total += 25; 
    else if (ano >= 1980 && ano <= 1999) total += 15;

    const checkExtra = (id, price) => { if(document.getElementById(id).checked) total += price; };
    
    checkExtra('piscina', 20);
    checkExtra('jardines', 15);
    checkExtra('calefaccionCentral', 20);
    checkExtra('placasSolares', 10);
    checkExtra('garajesPCI', 10);
    checkExtra('videoportero', 8);
    checkExtra('limpieza', 20);
    checkExtra('jardineria', 15);
    checkExtra('seguridad', 30);
    checkExtra('mantenimiento', 25);

    if(motivo === "Comunidad sin administrador") total += 15;

    const totalRedondeado = Math.round(total / 5) * 5;
    document.getElementById('precioMensual').innerText = totalRedondeado;
    
    irAlPaso(5);
}

// Envío a Google Forms del Cotizador
function enviarAGoogleForms() {
    const btn = document.getElementById('btnEnviar');
    btn.innerText = "Procesando...";
    btn.disabled = true;

    const finalDireccion = direccionSeleccionada.direccionCompleta || document.getElementById('direccion').value;
    const formURL = "https://docs.google.com/forms/d/e/1FAIpQLSfgndZwqBTfmFR9rl0aU-wGmkgKA8e3UxIH4-rMI2G0Y63aVg/formResponse";
    
    const fd = new FormData();
    const getVal = (id) => document.getElementById(id).value;
    const getCheck = (id) => document.getElementById(id).checked ? "Sí" : "No";

    fd.append("entry.952121618", getVal("email"));
    fd.append("entry.1865292917", getVal("nombre"));
    fd.append("entry.234721920", getVal("apellidos"));
    fd.append("entry.1100157545", getVal("telefono"));
    fd.append("entry.846456656", finalDireccion);
    fd.append("entry.106601160", direccionSeleccionada.calle || "N/A");
    fd.append("entry.795617294", direccionSeleccionada.numero || "N/A");
    fd.append("entry.53002704", direccionSeleccionada.ciudad || "N/A");
    fd.append("entry.1394003358", direccionSeleccionada.provincia || "N/A");
    fd.append("entry.773629670", direccionSeleccionada.codigoPostal || "N/A");
    fd.append("entry.147545752", getVal("viviendas"));
    fd.append("entry.1924463597", getVal("portales"));
    fd.append("entry.564268766", getVal("garajes"));
    fd.append("entry.2078929423", getVal("locales"));
    fd.append("entry.584238427", getVal("ascensores"));
    fd.append("entry.1975390158", getVal("trasteros"));
    fd.append("entry.1163192818", getVal("plantas"));
    fd.append("entry.596687529", getVal("salasComunes"));
    fd.append("entry.727114152", getVal("anoConstruccion"));
    fd.append("entry.405354445", getVal("motivo"));
    fd.append("entry.1521186204", getCheck("piscina"));
    fd.append("entry.1302898620", getCheck("jardines"));
    fd.append("entry.628796887", getCheck("calefaccionCentral"));
    fd.append("entry.98294061", getCheck("placasSolares"));
    fd.append("entry.1775785756", getCheck("garajesPCI"));
    fd.append("entry.652625492", getCheck("videoportero"));
    fd.append("entry.1005326668", getCheck("limpieza"));
    fd.append("entry.786662894", getCheck("jardineria"));
    fd.append("entry.1734050686", getCheck("seguridad"));
    fd.append("entry.1996415610", getCheck("mantenimiento"));
    fd.append("entry.2113593166", document.getElementById("precioMensual").innerText + " €/mes");
    fd.append("entry.507180921", "Consentimiento Aceptado");

    fetch(formURL, { method: "POST", mode: "no-cors", body: fd })
    .then(() => irAlPaso(6))
    .catch(() => {
        btn.disabled = false;
        btn.innerText = "Error, reintentar";
    });
}

// Modal Control
function openModal() { document.getElementById('legalModal').style.display = 'flex'; }
function closeModal() { document.getElementById('legalModal').style.display = 'none'; }
window.onclick = function(event) {
    const modal = document.getElementById('legalModal');
    if (event.target == modal) closeModal();
}

// Envío a Google Forms de la Home (Contacto básico)
function enviarContacto() {
    const btn = document.getElementById('btnEnviarContacto');
    const nombre = document.getElementById('cNombre').value;
    const email = document.getElementById('cMail').value;
    const mensaje = document.getElementById('cMensaje').value;

    if (!nombre || !email || !mensaje) {
        alert("Por favor, rellena todos los campos.");
        return;
    }

    btn.innerText = "Enviando...";
    btn.disabled = true;

    const formURL = "https://docs.google.com/forms/d/e/1FAIpQLSemH7TWACmrHYN0iZk0QCKMYsNO3UJGHjPyr6dlx2BJAnNNbQ/formResponse";
    const fd = new FormData();
    fd.append("entry.467394497", nombre);
    fd.append("entry.2139652702", email);
    fd.append("entry.1907644416", mensaje);

    fetch(formURL, { method: "POST", mode: "no-cors", body: fd })
    .then(() => {
        document.getElementById('contenedorContacto').innerHTML = `
            <div class="card" style="max-width:500px;margin:48px auto 0;padding:40px;text-align:center;">
                <div style="font-size:40px;color:#28a745;margin-bottom:20px">✓</div>
                <h3>¡Mensaje enviado!</h3>
                <p>Gracias por contactar. Te responderemos muy pronto.</p>
            </div>`;
    })
    .catch(() => {
        alert("Error al enviar.");
        btn.innerText = "Enviar Mensaje";
        btn.disabled = false;
    });
}