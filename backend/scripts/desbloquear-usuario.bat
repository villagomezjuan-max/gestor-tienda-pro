@echo off
REM ================================================================
REM Script para desbloquear usuarios bloqueados (Windows)
REM ================================================================

cd /d "%~dp0"

echo.
echo ===============================================
echo   HERRAMIENTA DE DESBLOQUEO DE USUARIOS
echo ===============================================
echo.

if "%1"=="" (
    echo Uso:
    echo   desbloquear-usuario.bat ^<username^>
    echo   desbloquear-usuario.bat --all
    echo   desbloquear-usuario.bat --list
    echo   desbloquear-usuario.bat --clean
    echo.
    echo Ejemplos:
    echo   desbloquear-usuario.bat admin
    echo   desbloquear-usuario.bat --all
    echo   desbloquear-usuario.bat --list
    echo.
    node desbloquear-usuario.js --help
) else (
    node desbloquear-usuario.js %*
)

echo.
pause
