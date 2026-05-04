@echo off
chcp 65001 >nul
echo ========================================
echo   GitHub 仓库更新脚本 (D:\AI-FM)
echo ========================================
echo.

cd /d "D:\AI-FM"

echo [1/5] 检查 Git 状态...
git status
echo.

echo [2/5] 添加更新的文件...
echo.

REM 核心代码文件
echo 添加核心代码文件...
git add src/music/ncm.js
git add src/brain/recommendation-strategy.js
git add src/brain/state.js
git add src/index.js

REM 文档文件
echo 添加文档文件...
git add README.md
git add CLAUDE.md
git add RECOMMENDATION-UPGRADE.md
git add OPTIMIZATION-SUMMARY.md
git add GITHUB-UPDATE-GUIDE.md
git add UPDATE-COMPLETE.md

REM 测试脚本
echo 添加测试脚本...
git add test-recommendation.js

REM 前端文件（如果有修改）
echo 添加前端文件...
git add frontend/src/App.vue
git add frontend/src/components/FooterStatus.vue
git add frontend/src/components/StatusSection.vue
git add frontend/src/components/ConfigModal.vue
git add frontend/src/components/TTSSettingsModal.vue

echo.
echo [3/5] 查看将要提交的文件...
git status
echo.

pause
echo.

echo [4/5] 提交更改...
git commit -m "feat: 推荐系统优化 - 混合推荐策略（70%% 探索 + 30%% 舒适区）

- 新增推荐策略模块（recommendation-strategy.js）
- 扩展网易云 API（相似推荐、艺术家搜索、热度筛选）
- 自动补充推荐功能（找不到歌曲时自动推荐相似歌曲）
- 智能意图识别（艺术家、心情、冷门偏好）
- 更新 README.md（新功能说明 + 致谢 mmguo）
- 新增推荐系统测试脚本
- 更新前端组件（配置模态框、TTS设置等）

详见：RECOMMENDATION-UPGRADE.md

灵感来源：mmguo (https://www.xiaohongshu.com/user/profile/55a508e8c2bdeb432f5763e2)"

echo.
echo [5/5] 推送到 GitHub...
echo.
echo 正在推送到 main 分支...
git push origin main

echo.
echo ========================================
echo   更新完成！
echo ========================================
echo.
echo 请访问你的 GitHub 仓库验证更新：
echo https://github.com/shenhuatian/AI-FM
echo.
pause
