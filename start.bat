@echo off
chcp 65001 >/dev/null
echo ╔════════════════════════════════════════╗
echo ║      🎵 启动 AI DJ 项目 🎵            ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/3] 启动后端服务器...
start "AI DJ Backend" cmd /k "cd /d "%~dp0" && npm start"
timeout /t 3 /nobreak >/dev/null

echo [2/3] 启动前端开发服务器...
start "AI DJ Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >/dev/null

echo [3/3] 等待服务启动...
timeout /t 5 /nobreak >/dev/null

echo.
echo ✅ 服务已启动！
echo.
echo 📡 后端地址: http://localhost:8080
echo 🎨 前端地址: http://localhost:3030
echo.
echo 💡 提示: 请在浏览器访问 http://localhost:3030
echo.
pause
