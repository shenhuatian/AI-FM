#!/bin/bash

echo "╔════════════════════════════════════════╗"
echo "║   🎵 Claudio FM - 启动脚本           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 检查网易云API是否运行
echo "📡 检查网易云API..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 网易云API已运行"
else
    echo "❌ 网易云API未运行"
    echo ""
    echo "请先启动网易云API:"
    echo "  cd netease-api/api-enhanced-main"
    echo "  node app.js"
    echo ""
    exit 1
fi

# 验证Cookie
echo ""
echo "🔐 验证VIP Cookie..."
node test-vip-final.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 启动AI DJ服务..."
npm start
