# GitHub 仓库更新指南 📦

## 📅 更新时间
2026-05-04

## 🎯 更新内容概述

本次更新主要包括：
1. ✅ 推荐系统优化（混合推荐策略）
2. ✅ 更新 README.md（新功能说明 + 致谢）
3. ✅ 新增文档和测试脚本

---

## 📋 需要更新的文件清单

### 1. 核心代码文件（必须上传）

#### 后端代码
```
src/music/ncm.js                          # 扩展了网易云 API（新增 4 个方法）
src/brain/recommendation-strategy.js      # 🆕 新增：推荐策略模块
src/brain/state.js                        # 新增 getPlays() 方法
src/index.js                              # 集成推荐策略，自动补充推荐
```

#### 前端代码
```
（前端代码无变化，无需更新）
```

---

### 2. 文档文件（必须上传）

```
README.md                                 # ✅ 已更新：新功能说明 + 致谢
CLAUDE.md                                 # ✅ 已更新：记录最新工作
RECOMMENDATION-UPGRADE.md                 # 🆕 新增：推荐系统详细文档
OPTIMIZATION-SUMMARY.md                   # 🆕 新增：优化总结
```

---

### 3. 测试脚本（推荐上传）

```
test-recommendation.js                    # 🆕 新增：推荐系统测试脚本
```

---

### 4. 配置文件（检查是否需要更新）

```
.env.example                              # 检查是否有新的环境变量
package.json                              # 检查依赖是否有变化
```

---

### 5. 不需要上传的文件

```
.env                                      # ❌ 包含敏感信息，不要上传
data/state.json                           # ❌ 用户数据，不要上传
cache/                                    # ❌ 缓存目录，不要上传
node_modules/                             # ❌ 依赖包，不要上传
.claude/                                  # ❌ Claude Code 配置，不要上传
```

---

## 🚀 更新步骤

### 方式一：使用 Git 命令行（推荐）

#### 1. 检查当前状态

```bash
cd "E:\My Ai DJ"
git status
```

#### 2. 添加需要更新的文件

```bash
# 添加核心代码文件
git add src/music/ncm.js
git add src/brain/recommendation-strategy.js
git add src/brain/state.js
git add src/index.js

# 添加文档文件
git add README.md
git add CLAUDE.md
git add RECOMMENDATION-UPGRADE.md
git add OPTIMIZATION-SUMMARY.md

# 添加测试脚本
git add test-recommendation.js

# 如果有其他新增文件
git add LICENSE
git add CONFIG-GUIDE.md
git add SAFE-UPLOAD-GUIDE.md
git add TODO.md
git add TTS-CONFIG-COMPLETE.md
git add TTS-MIGRATION-COMPLETE.md
git add TTS-SETUP.md
git add UPLOAD-FINAL-CHECKLIST.md
git add XIAOMI-TTS-SETUP.md
```

#### 3. 提交更改

```bash
git commit -m "feat: 推荐系统优化 - 混合推荐策略（70% 探索 + 30% 舒适区）

- 新增推荐策略模块（recommendation-strategy.js）
- 扩展网易云 API（相似推荐、艺术家搜索、热度筛选）
- 自动补充推荐功能（找不到歌曲时自动推荐相似歌曲）
- 智能意图识别（艺术家、心情、冷门偏好）
- 更新 README.md（新功能说明 + 致谢 mmguo）
- 新增推荐系统测试脚本

详见：RECOMMENDATION-UPGRADE.md"
```

#### 4. 推送到 GitHub

```bash
# 推送到主分支
git push origin master

# 或者推送到 main 分支（根据你的仓库设置）
git push origin main
```

---

### 方式二：使用 GitHub Desktop（图形界面）

#### 1. 打开 GitHub Desktop

- 选择你的仓库：`AI-FM`

#### 2. 查看更改

- 左侧会显示所有修改的文件
- 勾选需要提交的文件

#### 3. 填写提交信息

**Summary（必填）：**
```
feat: 推荐系统优化 - 混合推荐策略
```

**Description（可选）：**
```
- 新增推荐策略模块（recommendation-strategy.js）
- 扩展网易云 API（相似推荐、艺术家搜索、热度筛选）
- 自动补充推荐功能
- 智能意图识别
- 更新 README.md（新功能说明 + 致谢 mmguo）
- 新增推荐系统测试脚本

详见：RECOMMENDATION-UPGRADE.md
```

#### 4. 提交并推送

- 点击 **Commit to master**
- 点击 **Push origin**

---

## ⚠️ 注意事项

### 1. 检查 .gitignore

确保以下文件/目录在 `.gitignore` 中：

```
# 环境变量（包含敏感信息）
.env

# 用户数据
data/state.json

# 缓存
cache/
*.log

# 依赖
node_modules/

# Claude Code 配置
.claude/

# 临时文件
*.tmp
*.temp
```

### 2. 检查敏感信息

在推送前，确保以下文件中没有敏感信息：
- ❌ API Keys
- ❌ Cookies
- ❌ 密码
- ❌ 个人数据

### 3. 测试功能

推送前，建议先测试一下：

```bash
# 测试推荐系统
node test-recommendation.js

# 启动项目
npm run dev

# 访问 http://localhost:3030 测试功能
```

---

## 📝 提交信息规范

使用语义化提交信息（Conventional Commits）：

- `feat:` - 新功能
- `fix:` - 修复 bug
- `docs:` - 文档更新
- `style:` - 代码格式调整
- `refactor:` - 重构代码
- `test:` - 测试相关
- `chore:` - 构建/工具相关

**示例：**
```
feat: 推荐系统优化 - 混合推荐策略
fix: 修复歌曲去重问题
docs: 更新 README.md
```

---

## 🎉 更新后的效果

### GitHub 仓库页面

更新后，你的 GitHub 仓库会显示：

1. **README.md** - 包含新功能说明和致谢
2. **新增文档** - `RECOMMENDATION-UPGRADE.md`、`OPTIMIZATION-SUMMARY.md`
3. **新增测试脚本** - `test-recommendation.js`
4. **更新的代码** - 推荐系统相关代码

### 用户体验

用户克隆你的仓库后，会获得：
- ✅ 完整的推荐系统功能
- ✅ 详细的文档说明
- ✅ 测试脚本验证功能
- ✅ 致谢信息（mmguo）

---

## 🔍 验证更新

推送后，访问你的 GitHub 仓库：
https://github.com/shenhuatian/AI-FM

检查：
1. ✅ README.md 是否更新
2. ✅ 新增文件是否显示
3. ✅ 提交记录是否正确
4. ✅ 致谢信息是否显示

---

## 📚 相关文档

- [Git 基础教程](https://git-scm.com/book/zh/v2)
- [GitHub Desktop 使用指南](https://docs.github.com/zh/desktop)
- [Conventional Commits 规范](https://www.conventionalcommits.org/zh-hans/)

---

## 💡 常见问题

### Q1: 推送失败，提示 "rejected"？

**A:** 可能是远程仓库有新的提交，先拉取：
```bash
git pull origin master
# 解决冲突（如果有）
git push origin master
```

### Q2: 不小心提交了敏感信息怎么办？

**A:** 立即删除提交并强制推送：
```bash
git reset --soft HEAD~1  # 撤销最后一次提交
git push origin master --force  # 强制推送
```

**注意：** 强制推送会覆盖远程历史，谨慎使用！

### Q3: 如何查看提交历史？

**A:**
```bash
git log --oneline  # 简洁模式
git log            # 详细模式
```

---

## 🎊 完成！

按照以上步骤，你的 GitHub 仓库就更新完成了！

用户现在可以：
1. 克隆你的仓库
2. 体验新的推荐系统功能
3. 查看详细的文档说明
4. 看到对 mmguo 的致谢

**祝你的项目越来越好！** 🎵
