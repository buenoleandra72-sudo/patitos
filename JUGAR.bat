@echo off
chcp 65001 >nul
title DuckStrike - Iniciar Juego con Camara Web
echo ======================================================================
echo           DUCKSTRIKE - JUEGO DE MOTRICIDAD Y COORDINACION
echo ======================================================================
echo.
echo Iniciando servidor local en http://localhost:8080 ...
echo Esto permite que el navegador (Chrome, Edge, Firefox)
echo active la camara web sin restricciones de seguridad.
echo.
echo Abriendo juego en tu navegador predeterminado...
echo (Manten esta ventanita abierta mientras juegas)
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0server.ps1"
pause
