@echo off
title QuizClone Server
echo ---------------------------------------------------
echo   QuizClone - Tu Aplicacion de Flashcards
echo ---------------------------------------------------
echo.
echo   [1] Iniciando servidor de datos...
echo   [2] Tus datos se guardan automaticamente en database.json
echo.
echo   Por favor, NO CIERRES esta ventana mientras estudias.
echo.

start http://localhost:8000
php -S localhost:8000 router.php
