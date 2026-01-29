<#
.SYNOPSIS
    Script para descargar y procesar las últimas subvenciones de la BDNS.

.DESCRIPTION
    Este script automatiza el proceso de actualización de datos de subvenciones para la web InfoComunidad.
    1. Crea un directorio temporal.
    2. Descarga las convocatorias recientes usando 'bdns-fetch' para varias palabras clave.
    3. Procesa los archivos descargados, unifica los datos y elimina duplicados.
    4. Guarda el resultado final en 'assets/data/subvenciones.json'.
    5. Limpia los archivos temporales.

.PREREQUISITES
    - Python debe estar instalado.
    - La librería 'bdns-fetch' debe estar instalada (`pip install bdns-fetch`).
#>

# --- CONFIGURACIÓN ---
$basePath = $PSScriptRoot
$tempDir = Join-Path -Path $basePath -ChildPath "temp_data"
$outputFile = Join-Path -Path $basePath -ChildPath "assets\data\subvenciones.json"
$fechaDesde = "01/01/2025" # Buscar subvenciones a partir de esta fecha
$palabrasClave = @(
    "vivienda",
    "comunidades propietarios",
    "rehabilitacion edificios",
    "eficiencia energetica",
    "accesibilidad edificios",
    "ascensor",
    "fachada"
)

# --- INICIO DEL SCRIPT ---

Write-Host "Iniciando la actualización de subvenciones..."

# 1. Crear directorio temporal
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "Directorio temporal creado en '$tempDir'."

# 2. Descargar datos para cada palabra clave
foreach ($keyword in $palabrasClave) {
    $fileName = "$keyword".Replace(" ", "_") + ".jsonl"
    $filePath = Join-Path -Path $tempDir -ChildPath $fileName
    Write-Host " -> Descargando datos para '$keyword'..."
    try {
        bdns-fetch --output-file $filePath convocatorias-busqueda --descripcion $keyword --fechaDesde $fechaDesde --pageSize 100
    }
    catch {
        Write-Warning "No se pudieron descargar los datos para '$keyword'."
    }
}

Write-Host "Descarga completada. Procesando archivos..."

# 3. Procesar y unificar datos
$allData = @{} # Usamos una Hashtable para manejar duplicados

$files = Get-Item (Join-Path -Path $tempDir -ChildPath "*.jsonl")
foreach ($file in $files) {
    $tag = $file.BaseName.Replace("_", " ")
    $lines = Get-Content $file.FullName -Encoding UTF8
    foreach ($line in $lines) {
        try {
            $json = $line | ConvertFrom-Json
            if ($allData.ContainsKey($json.numeroConvocatoria)) {
                $allData[$json.numeroConvocatoria].tags += $tag
                $allData[$json.numeroConvocatoria].tags = $allData[$json.numeroConvocatoria].tags | Select-Object -Unique
            }
            else {
                $newItem = [PSCustomObject]@{
                    id            = $json.numeroConvocatoria
                    titulo        = $json.descripcion
                    organo        = $json.nivel3
                    fechaRegistro = $json.fechaRecepcion
                    region        = $json.nivel2
                    municipio     = $json.nivel2
                    ambito        = $json.nivel1
                    importe       = "Consultar bases"
                    url           = "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/" + $json.numeroConvocatoria
                    tags          = @($tag)
                }
                $allData[$json.numeroConvocatoria] = $newItem
            }
        }
        catch { } # Ignorar líneas mal formadas
    }
}

# 4. Guardar el archivo JSON final
$finalArray = $allData.Values | ForEach-Object { $_ }
$finalArray | ConvertTo-Json -Depth 5 | Set-Content $outputFile -Encoding UTF8
Write-Host "Procesamiento completado. Total de subvenciones únicas: $($finalArray.Count)." -ForegroundColor Green

# 5. Limpiar archivos temporales
Write-Host "Limpiando archivos temporales..."
Remove-Item -Recurse -Force $tempDir

Write-Host "¡Actualización finalizada!" -ForegroundColor Green
