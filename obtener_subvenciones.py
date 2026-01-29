import json
from bdns.fetch import BDNSClient, DescripcionTipoBusqueda
from datetime import datetime

# --- Configuración ---
ARCHIVO_SALIDA = "assets/data/subvenciones.json"
ORGANOS_MADRID = [16, 2993] # Comunidad y Ayuntamiento
PALABRAS_CLAVE = "vivienda OR rehabilitacion OR eficiencia OR accesibilidad OR comunidades"
FECHA_DESDE = "2025-01-01"

def obtener_datos_madrid():
    print("Iniciando descarga de subvenciones específicas para Madrid...")
    todas_las_subvenciones = {}
    
    try:
        # 1. Crear un cliente de la API
        cliente = BDNSClient()
        
        # 2. Usar el método correcto para buscar convocatorias
        resultados = cliente.fetch_convocatorias_busqueda(
            organos=ORGANOS_MADRID,
            descripcion=PALABRAS_CLAVE,
            descripcionTipoBusqueda=DescripcionTipoBusqueda.alguna, # Usamos el tipo enumerado
            fechaDesde=datetime.strptime(FECHA_DESDE, "%Y-%m-%d").date()
        )
        
        for item in resultados:
            # Mapear los datos de BDNS a nuestro formato simplificado
            subvencion_formateada = {
                "id": item.get('numeroConvocatoria'),
                "titulo": item.get('descripcion'),
                "organo": item.get('nivel3'),
                "fechaRegistro": item.get('fechaRecepcion'),
                "region": "Madrid",
                "municipio": item.get('nivel2'),
                "ambito": item.get('nivel1'),
                "importe": "Consultar bases",
                "url": "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/" + item.get('numeroConvocatoria'),
                "tags": [tag for tag in PALABRAS_CLAVE.split(" OR ") if tag in (item.get('descripcion') or '').lower()]
            }
            todas_las_subvenciones[subvencion_formateada["id"]] = subvencion_formateada
        
        print(f"Se han encontrado {len(todas_las_subvenciones)} subvenciones únicas para Madrid.")
        
        lista_final = list(todas_las_subvenciones.values())
        with open(ARCHIVO_SALIDA, "w", encoding="utf-8") as f:
            json.dump(lista_final, f, ensure_ascii=False, indent=4)
        
        print(f"Datos de Madrid guardados correctamente en {ARCHIVO_SALIDA}")

    except Exception as e:
        print(f"Error durante la obtención de datos: {e}")

if __name__ == "__main__":
    obtener_datos_madrid()
