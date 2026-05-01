FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 跳过 husky 安装，安装依赖
RUN npm install --production --ignore-scripts

# 复制所有源码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "app.js"]
