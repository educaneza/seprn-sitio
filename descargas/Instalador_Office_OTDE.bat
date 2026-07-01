@echo off
setlocal enabledelayedexpansion

:: ==============================================================
:: AUTO-ELEVACION A ADMINISTRADOR
:: ==============================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ==============================================================
:: SISTEMA PROFESIONAL DE INSTALACION OFFICE - OTDE NEZA
:: Version 3.0 FINAL - Lista para Produccion
:: ==============================================================

:: ==============================================================
:: CONTROL REMOTO DEL INSTALADOR - VALIDACION JSON
:: ==============================================================
set "URL_ESTADO=https://script.google.com/macros/s/AKfycbwQKJwi2M1G4pVtITPpopn2yBKHA4LVs8FN_JoAPV4-1uBC5H8po4fMxgY0Yx71iw/exec"
set "WORK_DIR=%~dp0temp"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"
set "TMP_ESTADO=%WORK_DIR%\estado_otde.json"
del "%TMP_ESTADO%" >nul 2>&1

echo Validando sistema de control remoto...
curl -L -s --connect-timeout 10 --max-time 15 "%URL_ESTADO%" -o "%TMP_ESTADO%"

if not exist "%TMP_ESTADO%" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('No se pudo validar el instalador. Verifique su conexion a Internet.','Error de Validacion','OK','Error')"
    exit /b 1
)

for /f "usebackq delims=" %%A in (`powershell -command "$json = Get-Content '%TMP_ESTADO%' -Raw | ConvertFrom-Json; if ($json.activo -eq $true) { 'TRUE' } else { 'FALSE' }"`) do set "ESTADO=%%A"

if "%ESTADO%"=="FALSE" (
    for /f "usebackq delims=" %%M in (`powershell -command "$json = Get-Content '%TMP_ESTADO%' -Raw | ConvertFrom-Json; $json.mensaje"`) do set "MENSAJE_SISTEMA=%%M"
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('!MENSAJE_SISTEMA!'+[Environment]::NewLine+[Environment]::NewLine+'Por favor intente mas tarde o comuniquese con la OTDE NEZA.','Sistema no disponible','OK','Information')"
    del "%TMP_ESTADO%" >nul 2>&1
    exit /b 1
)

if not "%ESTADO%"=="TRUE" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Error al validar el estado del sistema. Contacte a la OTDE NEZA.','Error de Control','OK','Stop')"
    del "%TMP_ESTADO%" >nul 2>&1
    exit /b 1
)

del "%TMP_ESTADO%" >nul 2>&1

:: ==============================================================
:: ENTORNO GENERAL
:: ==============================================================
cd /d "%~dp0"
title SISTEMA INSTITUCIONAL DE GESTION - OTDE NEZA v3.0 FINAL
color 1f
set "off_instalar=Office 2019 Professional Plus"

:: ==============================================================
:: DATOS DEL EQUIPO Y USUARIO
:: ==============================================================
set "usuario=%USERNAME%"
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-CimInstance Win32_ComputerSystem).Manufacturer" 2^>nul`) do set "marca=%%a"
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-CimInstance Win32_ComputerSystem).Model" 2^>nul`) do set "equipo=%%a"
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-CimInstance Win32_Bios).SerialNumber" 2^>nul`) do set "serie=%%a"

if "%marca%"=="" set "marca=No detectada"
if "%equipo%"=="" set "equipo=No detectado"
if "%serie%"=="" set "serie=No detectado"

:: ==============================================================
:: CHEQUEO RAPIDO DEL SISTEMA
:: ==============================================================
cls
color 0B
echo ============================================================
echo    SISTEMA DE INSTALACION OFFICE 2019 PROFESSIONAL PLUS
echo       Oficina de Tecnologia para el Desarrollo        
echo          Educativo - OTDE NEZAHUALCOYOTL          
echo ============================================================
echo.
echo VERIFICACION DEL SISTEMA
echo.

echo Conexion a Internet...
ping -n 1 -w 3000 www.microsoft.com >nul 2>&1 && (
    echo OK - Conexion activa
    color 0A
) || (
    echo ERROR - Sin conexion - Se requiere Internet
    color 0C
    echo.
    echo Presione cualquier tecla para salir...
    pause >nul
    exit /b 1
)

echo Configuracion de energia...
powercfg /getactivescheme >nul 2>&1 && echo OK - Configuracion detectada

echo Verificando Office previo...
set "office_previo=NO"
if exist "C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE" (
    echo AVISO - Office detectado - Se desinstalara automaticamente
    color 0E
    set "office_previo=SI"
) else (
    echo OK - Equipo listo para instalar
    color 0A
)

echo Verificando archivos de instalacion...
if exist "setup.exe" (
    if exist "Office2019Plus.xml" (
        echo OK - Todos los archivos encontrados
        color 0A
    ) else (
        echo ERROR - Falta Office2019Plus.xml
        color 0C
        pause
        exit /b 1
    )
) else (
    echo ERROR - Falta setup.exe
    color 0C
    pause
    exit /b 1
)

echo.
echo Presione cualquier tecla para continuar...
pause >nul

:: ==============================================================
:: DESCARGA DE BASE DE DATOS ACTUALIZADA
:: ==============================================================
cls
echo ============================================================
echo      DESCARGANDO BASE DE DATOS ACTUALIZADA...
echo ============================================================
echo.

set "URL_DB=https://docs.google.com/spreadsheets/d/e/2PACX-1vTVXZL0egYZa12wmJ-mWsolCW8QF4heZGWUkA-CuMWBL-Dcm4wia7-h_rnfje3nEQdNOIk42PfNRKg2/pub?gid=0&single=true&output=csv"
set "DB_FILE=%WORK_DIR%\escuelas_otde.csv"
del "%DB_FILE%" >nul 2>&1

curl -L -s --connect-timeout 15 --max-time 30 "%URL_DB%" -o "%DB_FILE%"

if not exist "%DB_FILE%" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('No se pudo descargar la base de datos. Verifique su conexion.','Error Critico','OK','Error')"
    exit /b 1
)

echo OK - Base de datos descargada correctamente
timeout /t 2 >nul

:: ==============================================================
:: CAPTURA Y VALIDACION DE CCT
:: ==============================================================
:PEDIR_CCT
cls
color 1f
echo ============================================================
echo   SUBDIRECCION DE EDUCACION PRIMARIA - REGION NEZA
echo  Oficina de Tecnologia para el Desarrollo Educativo (OTDE)
echo ============================================================
echo.
echo Este software es de uso EXCLUSIVO institucional.
echo.
echo ------------------------------------------------------------
echo.

set "cct="
set "psPrompt=Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('Ingrese la CCT de su escuela (15DPR####X):','OTDE Nezahualcoyotl','')"
for /f "usebackq delims=" %%a in (`powershell -command "%psPrompt%" 2^>nul`) do set "cct=%%a"

if "%cct%"=="" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('La CCT es obligatoria.','Aviso','OK','Information')"
    goto PEDIR_CCT
)

for /f "usebackq delims=" %%a in (`powershell -command "'%cct%'.Trim().ToUpper()"`) do set "cct=%%a"

:: ==============================================================
:: VALIDACION DE CCT CON POWERSHELL
:: ==============================================================
set "PS_SCRIPT=%WORK_DIR%\validar_cct.ps1"

(
echo $csv = Import-Csv '%DB_FILE%'
echo $cct = '%cct%'
echo $row = $csv ^| Where-Object { $_.CCT.Trim^(^).ToUpper^(^) -eq $cct.Trim^(^).ToUpper^(^) }
echo if ^($row^) {
echo     Write-Output "OK"
echo     Write-Output $row.Escuela
echo     Write-Output $row.Zona
echo     Write-Output $row.Sector
echo     Write-Output $row.Max_Instalaciones
echo     Write-Output $row.Instaladas
echo     Write-Output $row.Bloqueada
echo } else {
echo     Write-Output "FAIL"
echo }
) > "%PS_SCRIPT%"

set "status=FAIL"
set "linea=0"
for /f "usebackq delims=" %%A in (`powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"`) do (
    set /a linea+=1
    if !linea!==1 set "status=%%A"
    if !linea!==2 set "nombre_escuela=%%A"
    if !linea!==3 set "zona_escuela=%%A"
    if !linea!==4 set "sector_escuela=%%A"
    if !linea!==5 set "max_instalaciones=%%A"
    if !linea!==6 set "instalaciones_actuales=%%A"
    if !linea!==7 set "bloqueada=%%A"
)

del "%PS_SCRIPT%" >nul 2>&1

if not "%status%"=="OK" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('La CCT [%cct%] NO se encuentra en la base de datos oficial.'+[Environment]::NewLine+[Environment]::NewLine+'Contacte a la OTDE NEZA.','Acceso Denegado','OK','Stop')"
    goto PEDIR_CCT
)

for /f "tokens=* delims= " %%a in ("%nombre_escuela%") do set "nombre_escuela=%%a"
for /f "tokens=* delims= " %%a in ("%zona_escuela%") do set "zona_escuela=%%a"
for /f "tokens=* delims= " %%a in ("%sector_escuela%") do set "sector_escuela=%%a"
for /f "tokens=* delims= " %%a in ("%max_instalaciones%") do set "max_instalaciones=%%a"
for /f "tokens=* delims= " %%a in ("%instalaciones_actuales%") do set "instalaciones_actuales=%%a"
for /f "tokens=* delims= " %%a in ("%bloqueada%") do set "bloqueada=%%a"

if "%bloqueada%"=="" set "bloqueada=NO"
for /f "usebackq delims=" %%a in (`powershell -command "'%bloqueada%'.Trim().ToUpper()"`) do set "bloqueada=%%a"
if "%bloqueada%"=="SI" (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('La CCT [%cct%] se encuentra BLOQUEADA.'+[Environment]::NewLine+[Environment]::NewLine+'Contacte a la OTDE NEZA para mas informacion.','Acceso Bloqueado','OK','Stop')"
    goto PEDIR_CCT
)

if "%max_instalaciones%"=="" set "max_instalaciones=0"
if "%instalaciones_actuales%"=="" set "instalaciones_actuales=0"

set /a "restantes=%max_instalaciones%-%instalaciones_actuales%" 2>nul

if %restantes% LEQ 0 (
    powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('La CCT [%cct%] ha alcanzado el limite de instalaciones.'+[Environment]::NewLine+[Environment]::NewLine+'Contacte a la OTDE NEZA para mas informacion.','Limite Alcanzado','OK','Warning')"
    goto PEDIR_CCT
)

:: ==============================================================
:: REGISTRO DE INICIO
:: ==============================================================
color 2f
cls
echo ============================================================
echo         DATOS DE ADSCRIPCION CONFIRMADOS
echo ============================================================
echo Escuela: %nombre_escuela%
echo CCT: %cct%
echo Zona / Sector: %zona_escuela% / %sector_escuela%
echo ============================================================
echo.
echo Registrando datos en el sistema...

set "URL_REGISTRO=https://script.google.com/macros/s/AKfycby8iiwNsPVdkZEKdLHPOMj7IKVX-mWFYVKLe8z2NzEuknvYP3-ifm_UOCn2PTZ2Hco/exec"

curl -G -L -s --connect-timeout 10 --max-time 20 "%URL_REGISTRO%" --data-urlencode "accion=registro" --data-urlencode "cct=%cct%" --data-urlencode "escuela=%nombre_escuela%" --data-urlencode "usuario=%usuario%" --data-urlencode "sector=%sector_escuela%" --data-urlencode "zona=%zona_escuela%" --data-urlencode "marca=%marca%" --data-urlencode "serie=%serie%" --data-urlencode "office=INICIO:%off_instalar%" --data-urlencode "resultado=INICIANDO"

timeout /t 2 >nul
echo OK - Registro inicial completado

:: ==============================================================
:: CONFIRMACION E INSTALACION
:: ==============================================================
echo.
echo Recomendaciones antes de instalar:
echo ------------------------------------------------------------
echo - Cierre todos los programas
echo - Mantenga conexion a Internet estable
echo - NO apague ni reinicie el equipo durante la instalacion
echo.

if "%office_previo%"=="SI" (
    echo AVISO - Se desinstalara automaticamente Office previo
    echo.
)

echo Presione cualquier tecla para iniciar la instalacion...
pause >nul

:: ==============================================================
:: DESINSTALACION AUTOMATICA DE OFFICE PREVIO
:: ==============================================================
if "%office_previo%"=="SI" (
    cls
    color 0e
    echo ============================================================
    echo      DESINSTALANDO VERSIONES PREVIAS DE OFFICE
    echo ============================================================
    echo.
    echo Este proceso puede tardar 5-10 minutos...
    echo Por favor NO interrumpa el proceso.
    echo.
    
    if exist "%~dp0configuration_uninstall.xml" (
        setup.exe /configure configuration_uninstall.xml
    )
    
    timeout /t 5 >nul
    
    echo.
    echo OK - Limpieza completada
    timeout /t 3 >nul
)

:: ==============================================================
:: INSTALACION DE OFFICE 2019
:: ==============================================================
cls
color 0e
echo ============================================================
echo    INSTALANDO MICROSOFT OFFICE 2019 PROFESSIONAL PLUS
echo ============================================================
echo.
echo Por favor espere... Este proceso puede tardar 10-30 minutos.
echo.
echo NO APAGUE NI REINICIE EL EQUIPO
echo NO CIERRE ESTA VENTANA
echo.
echo Progreso: Descargando e instalando componentes...
echo ============================================================
echo.

setup.exe /configure Office2019Plus.xml

:: ==============================================================
:: RESULTADO DE INSTALACION
:: ==============================================================
set "errorcode=%errorlevel%"

if %errorcode% neq 0 (
    set "resultado=ERROR - Codigo %errorcode%"
    set "st_code=ERROR"
    color 4f
    cls
    echo ============================================================
    echo         ERROR DURANTE LA INSTALACION
    echo ============================================================
    echo.
    echo Codigo de error: %errorcode%
    echo.
    echo Posibles causas:
    echo - Falta de espacio en disco
    echo - Conexion a Internet interrumpida
    echo - Antivirus bloqueando la instalacion
    echo - Archivos de instalacion corruptos
    echo.
    echo Contacte a la OTDE NEZA con el codigo de error.
    echo ============================================================
) else (
    set "resultado=EXITOSO"
    set "st_code=EXITOSO"
    color 2f
    
    cls
    echo ============================================================
    echo      INSTALACION COMPLETADA EXITOSAMENTE
    echo ============================================================
    echo.
    echo Actualizando registros del sistema...
    
    curl -G -L -s --connect-timeout 10 --max-time 20 "%URL_REGISTRO%" --data-urlencode "accion=contador" --data-urlencode "cct=%cct%"
    
    timeout /t 2 >nul
)

:: ==============================================================
:: REGISTRO FINAL
:: ==============================================================
echo Enviando reporte final...

curl -G -L -s --connect-timeout 10 --max-time 20 "%URL_REGISTRO%" --data-urlencode "accion=registro" --data-urlencode "cct=%cct%" --data-urlencode "escuela=%nombre_escuela%" --data-urlencode "usuario=%usuario%" --data-urlencode "sector=%sector_escuela%" --data-urlencode "zona=%zona_escuela%" --data-urlencode "marca=%marca% - %equipo%" --data-urlencode "serie=%serie%" --data-urlencode "office=%off_instalar%" --data-urlencode "resultado=%resultado%"

timeout /t 2 >nul
echo OK - Reporte enviado

if "%st_code%"=="ERROR" (
    echo.
    pause
    exit /b 1
)

:: ==============================================================
:: CIERRE INSTITUCIONAL EXITOSO
:: ==============================================================
cls
color 2f
echo ============================================================
echo       PROCESO FINALIZADO EXITOSAMENTE
echo ============================================================
echo.
echo OK - Microsoft Office 2019 Professional Plus instalado
echo OK - Datos registrados en el sistema OTDE
echo.
echo ------------------------------------------------------------
echo               AVISO DE PRIVACIDAD
echo ------------------------------------------------------------
echo Los datos recabados se utilizan unicamente para:
echo - Control estadistico institucional
echo - Gestion de licenciamiento educativo
echo - Soporte tecnico
echo.
echo Datos registrados:
echo - CCT y nombre de la escuela
echo - Usuario del equipo
echo - Marca y numero de serie del equipo
echo - Resultado de la instalacion
echo.
echo ------------------------------------------------------------
echo                  CREDITOS
echo ------------------------------------------------------------
echo Oficina de Tecnologia para el Desarrollo Educativo (OTDE)
echo Subdireccion de Educacion Primaria - Region Nezahualcoyotl
echo Cd. Nezahualcoyotl, Estado de Mexico - 2026
echo.
echo Version 3.0 FINAL - Enero 2026
echo ============================================================
echo.
echo Presione cualquier tecla para salir...
pause >nul

:: Limpiar archivos temporales
del "%DB_FILE%" >nul 2>&1
rd /s /q "%WORK_DIR%" >nul 2>&1

exit /b 0