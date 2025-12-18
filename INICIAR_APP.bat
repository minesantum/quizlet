@echo off
title QuizClone Server
echo ---------------------------------------------------
echo   QuizClone - Tu Aplicacion de Flashcards
echo ---------------------------------------------------
echo.
echo   [1] Buscando entorno PHP...

set "PHP_BIN=php"
if exist "%~dp0bin\php\php.exe" (
    echo   [2] Usando PHP Portable...
    set "PHP_BIN=%~dp0bin\php\php.exe"
) else (
    echo   [2] Usando PHP del Sistema...
)

echo   [3] Iniciando servidor de datos...
echo   [4] Tus datos se guardan automaticamente en database.json
echo.
echo   Por favor, NO CIERRES esta ventana mientras estudias.
echo.

start http://localhost:8000
"%PHP_BIN%" -S localhost:8000 router.php
