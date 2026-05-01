@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════╗
echo ║   🎵 Claudio FM - 启动脚本           ║
echo ╚════════════════════════════════════════╝
echo.

REM 检查网易云API是否运行
echo 📡 检查网易云API...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 网易云API已运行
) else (
    echo ❌ 网易云API未运行
    echo.
    echo 请先启动网易云API:
    echo   cd netease-api\api-enhanced-main
    echo   node app.js
    echo.
    pause
    exit /b 1
)

REM 验证Cookie
echo.
echo 🔐 验证VIP Cookie...
node test-vip-final.js

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 🚀 启动AI DJ服务...
npm start
