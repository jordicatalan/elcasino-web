@echo off
chcp 65001 >nul
title El Casino - Demostracion local
cd /d "%~dp0"

echo.
echo  ===========================================
echo    EL CASINO - MODO DEMOSTRACION
echo  ===========================================
echo.
echo  Abriendo tres ventanas:
echo    1. Servidor web        (la web)
echo    2. Servidor del panel  (para editar la carta)
echo    3. Vigilante           (regenera la carta al guardar)
echo.

start "El Casino - Servidor web" cmd /k "python -m http.server 8000"
timeout /t 2 >nul

start "El Casino - Panel" cmd /k "npx -y decap-server"
timeout /t 3 >nul

start "El Casino - Vigilante" cmd /k "node vigilar.js"
timeout /t 2 >nul

start "" "http://localhost:8000/index.html"
timeout /t 1 >nul
start "" "http://localhost:8000/admin/"

echo.
echo  ¡Listo! Se han abierto dos pestanas:
echo    - La web:    http://localhost:8000
echo    - El panel:  http://localhost:8000/admin/
echo.
echo  En modo local el panel NO pide contrasena.
echo  Al pulsar "Publish", la carta se actualiza en 1 segundo.
echo.
echo  Para terminar: cierra las tres ventanas negras.
echo.
pause
