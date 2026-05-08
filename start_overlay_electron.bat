@echo off
REM Wuthering Waves Overlay - Electron Launcher

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js não está instalado!
    echo Por favor, instale Node.js de https://nodejs.org/
    pause
    exit /b 1
)

echo Instalando dependências...
call npm install

if errorlevel 1 (
    echo ERRO ao instalar dependências!
    pause
    exit /b 1
)

echo Iniciando aplicativo...
call npm start

pause
