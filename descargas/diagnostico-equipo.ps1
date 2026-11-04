# ============================================================
# Diagnóstico de equipo — OTDE SEPRN (aulas de medios)
# Lo ejecuta diagnostico-equipo.bat. Solo LEE información del equipo:
# no instala, no borra y no cambia nada. Agrega una fila a
# inventario-equipos.csv en la misma carpeta (la USB del técnico).
# Guía: https://educaneza.github.io/seprn-sitio/docs/guia-aulas-de-medios.html
# ============================================================
$ErrorActionPreference = 'SilentlyContinue'
$carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path
$csv = Join-Path $carpeta 'inventario-equipos.csv'

Clear-Host
Write-Host ''
Write-Host '  DIAGNÓSTICO DE EQUIPO - OTDE' -ForegroundColor White -BackgroundColor DarkRed
Write-Host ''
$cct = (Read-Host '  CCT de la escuela (ej. 15EPR0000X)').Trim().ToUpper()
$num = (Read-Host '  Número o etiqueta de esta máquina').Trim()
Write-Host ''
Write-Host '  Revisando el equipo, espera unos segundos...' -ForegroundColor Gray

$cs   = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1
$os   = Get-CimInstance Win32_OperatingSystem
$c    = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"

$ramGB   = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
$cpuNom  = ($cpu.Name -replace '\s+', ' ').Trim()
$cpu64   = ($cpu.DataWidth -eq 64)
$libreGB = [math]::Round($c.FreeSpace / 1GB, 1)
$totalGB = [math]::Round($c.Size / 1GB, 0)

# Tipo de disco (Windows 8 o posterior). Si no se puede saber, se anota "No se sabe".
$disco = 'No se sabe'
$fis = Get-PhysicalDisk | Sort-Object DeviceId | Select-Object -First 1
if ($fis) {
  switch ("$($fis.MediaType)") {
    'SSD' { $disco = 'SSD' }
    'HDD' { $disco = 'Mecánico (HDD)' }
    default { if ($fis.SpindleSpeed -eq 0) { $disco = 'SSD' } elseif ($fis.SpindleSpeed -gt 0) { $disco = 'Mecánico (HDD)' } }
  }
}

# Programas instalados que importan para el mantenimiento
$rutas = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$apps = Get-ItemProperty $rutas | Where-Object { $_.DisplayName } | Select-Object -ExpandProperty DisplayName
function Tiene($patron) { [bool]($apps | Where-Object { $_ -match $patron }) }

$congelador = @()
if (Tiene 'Time Freeze')    { $congelador += 'Toolwiz' }
if (Tiene 'Reboot Restore') { $congelador += 'Reboot Restore Rx' }
if (Tiene 'Deep ?Freeze')   { $congelador += 'Deep Freeze' }
$xampp = (Test-Path 'C:\xampp') -or (Tiene 'XAMPP')

$pesados = @()
foreach ($p in @('360 Total Security', 'Avast', 'AVG', 'McAfee', 'Norton', 'Kaspersky', 'Panda', 'USB Disk Security',
                 'Adobe Flash Player', 'CCleaner', 'Advanced SystemCare', 'Driver Booster', 'WinZip')) {
  if (Tiene ([regex]::Escape($p))) { $pesados += $p }
}
$alInicio = @(Get-CimInstance Win32_StartupCommand).Count

# Tiempo del último arranque (requiere permisos; si no se puede, queda vacío)
$arranqueSeg = ''
$ev = Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100 } -MaxEvents 1
if ($ev) {
  $xml = [xml]$ev.ToXml()
  $ms = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' }).'#text'
  if ($ms) { $arranqueSeg = [math]::Round([double]$ms / 1000, 0) }
}

# Semáforo (mismos criterios que la guía, sección 4)
$cpuDebil = $cpuNom -match 'Atom|Celeron N|Celeron\(R\) CPU N|Pentium N|E-350|E-450|E-300|E1-|E2-|C-50|C-60|A4-1|A6-1|Sempron'
$color = 'VERDE'; $motivo = @()
if ($ramGB -lt 1.8) { $color = 'ROJO'; $motivo += 'menos de 2 GB de RAM' }
if (-not $cpu64)    { $color = 'ROJO'; $motivo += 'procesador de 32 bits' }
if ($color -ne 'ROJO') {
  if ($ramGB -lt 3.5) { $color = 'AMARILLO'; $motivo += 'menos de 4 GB de RAM' }
  if ($cpuDebil)      { $color = 'AMARILLO'; $motivo += 'procesador de gama baja' }
}
if ($motivo.Count -eq 0) { $motivo += '4 GB o más y procesador de 64 bits' }

$que = switch ($color) {
  'VERDE'    { 'Windows 10 aligerado + Office (Word/Excel/PowerPoint) + Banco de Materiales + congelador al final.' }
  'AMARILLO' { 'Windows 10 aligerado y SOLO lo que la escuela usa (Banco u Office, no todo). Si hay RAM compatible de una máquina roja, súbela.' }
  'ROJO'     { 'No reinstalar. Usar como donadora de piezas y anotar para baja en el reporte de visita.' }
}
$extra = @()
if ($disco -like 'Mec*')     { $extra += 'Disco mecánico: un SSD (~$300) la haría mucho más rápida.' }
if ($pesados.Count -gt 0)     { $extra += ('Quitar: ' + ($pesados -join ', ') + '.') }
if ($alInicio -gt 8)          { $extra += "Tiene $alInicio programas que arrancan solos: quitar los que sobren." }
if ($libreGB -lt 10)          { $extra += "Solo $libreGB GB libres en C: liberar espacio." }

$fila = [pscustomobject][ordered]@{
  'Fecha'               = (Get-Date -Format 'yyyy-MM-dd HH:mm')
  'CCT'                 = $cct
  'Máquina'             = $num
  'Semáforo'            = $color
  'Motivo'              = ($motivo -join '; ')
  'Marca'               = "$($cs.Manufacturer)".Trim()
  'Modelo'              = "$($cs.Model)".Trim()
  'Serie'               = "$($bios.SerialNumber)".Trim()
  'Procesador'          = $cpuNom
  'CPU 64 bits'         = $(if ($cpu64) { 'Sí' } else { 'No' })
  'RAM (GB)'            = $ramGB
  'Disco'               = $disco
  'Disco C total (GB)'  = $totalGB
  'Disco C libre (GB)'  = $libreGB
  'Windows'             = "$($os.Caption)".Trim()
  'Versión'             = $os.Version
  'Arquitectura'        = $os.OSArchitecture
  'Último arranque (s)' = $arranqueSeg
  'Programas al inicio' = $alInicio
  'Congelador'          = $(if ($congelador.Count) { $congelador -join ', ' } else { 'No' })
  'XAMPP'               = $(if ($xampp) { 'Sí' } else { 'No' })
  'Programas a quitar'  = ($pesados -join ', ')
}

$guardado = $true
try { $fila | Export-Csv -Path $csv -Append -NoTypeInformation -Encoding UTF8 -ErrorAction Stop }
catch { $guardado = $false }

# ── Resultado en pantalla ──
$fondo = @{ 'VERDE' = 'DarkGreen'; 'AMARILLO' = 'DarkYellow'; 'ROJO' = 'DarkRed' }[$color]
Clear-Host
Write-Host ''
Write-Host ("   MÁQUINA $num  -  $color   ") -ForegroundColor White -BackgroundColor $fondo
Write-Host ''
Write-Host "  $($cs.Manufacturer) $($cs.Model)"
Write-Host "  $cpuNom"
Write-Host "  RAM: $ramGB GB   Disco: $disco   Libre en C: $libreGB GB"
Write-Host "  $($os.Caption)"
if ($arranqueSeg -ne '') { Write-Host "  Último arranque: $arranqueSeg segundos" }
Write-Host ''
Write-Host '  Por qué:' -ForegroundColor Yellow
Write-Host ('  ' + ($motivo -join '; '))
Write-Host ''
Write-Host '  Qué hacer:' -ForegroundColor Yellow
Write-Host "  $que"
foreach ($e in $extra) { Write-Host "  - $e" }
Write-Host ''
if ($guardado) { Write-Host "  Guardado en $csv" -ForegroundColor Gray }
else { Write-Host '  NO se pudo guardar el CSV (¿está abierto en Excel? ¿la USB está protegida?). Anota el color a mano.' -ForegroundColor Red }
Write-Host ''
