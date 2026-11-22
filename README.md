# 宠知微（PetCare）

面向猫狗主人的宠物健康档案与记录工具。使用响应式 Web + PWA 实现，一套代码同时适配手机与电脑浏览器，可添加到桌面使用。

## 主要功能

- 账号：用户名 + 密码注册与登录，登录页区分「用户登录 / 管理员登录」
- 宠物档案：昵称、猫/狗、品种、性别、生日、绝育状态、头像、备注，支持多只宠物
- 身体状况：按日期记录体重（含趋势图）、体温、饮食、饮水、排便/排尿、呕吐、精神状态、症状、过敏史
- 用药记录：药名、剂量、频次、起止日期
- 就医记录：就诊日期、医院、医生、科室、主诉、诊断、处方、费用、复诊日期，支持上传多张检查报告图片
- 防疫驱虫：疫苗名称/针次/日期/下次到期；驱虫类型/日期/下次到期
- 到期提醒：列表展示下次到期日，7 天内到期或已逾期高亮，首页提供「即将到期」汇总
- 生活照：图片、文字说明、标签
- 账号设置：修改密码、导出全部数据（JSON）、注销账号
- 管理后台：统计概览、用户列表、只读查看用户宠物与全部记录、禁用/启用、重置密码、删除用户
- PWA：支持添加到主屏幕，移动端底部导航与响应式布局

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18、TypeScript、Vite、React Router、Tailwind CSS、Recharts、vite-plugin-pwa |
| 后端 | Node.js、Express、JWT（httpOnly Cookie）、bcryptjs、multer |
| 数据库 | SQLite（Node.js 内置 `node:sqlite`） |

## 运行环境

- Node.js **22.5 或更高版本**（使用了内置 `node:sqlite`；启动时出现 ExperimentalWarning 属正常现象）
- npm 10+
- 现代浏览器（Chrome / Edge / Safari / Firefox）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（Windows 可用 copy .env.example .env）
cp .env.example .env
```

编辑 `.env`，至少填写：

| 变量 | 说明 |
|---|---|
| PORT | 服务端口，默认 3001 |
| JWT_SECRET | 登录令牌签名密钥，请填写 32 位以上随机字符串 |
| ADMIN_USERNAME | 管理员账号名 |
| ADMIN_PASSWORD | 管理员初始密码（仅首次初始化时使用） |

```bash
# 3. 初始化数据库（建表 + 创建管理员账号）
npm run db:init

# 4a. 开发模式（前端 5173 + 后端 3001，热更新）
npm run dev
# 浏览器访问 http://localhost:5173

# 4b. 生产模式（构建后由 Express 统一托管）
npm run build
npm start
# 浏览器访问 http://localhost:3001
```

管理员账号由初始化脚本根据 `.env` 创建，数据库中只保存 bcrypt 哈希，仓库与文档中不包含明文口令。

## 目录结构

```
.
├── Agent.md                 # 需求、验收标准、进度与协作记录
├── client/                  # 前端源码
│   ├── public/icons/        # PWA 图标
│   └── src/
│       ├── components/      # 布局与通用 UI
│       ├── pages/           # 登录、首页、宠物详情、设置、管理后台
│       └── pages/tabs/      # 体重/身体/就医/防疫/用药/相册
├── server/
│   ├── db/                  # 数据库连接、schema.sql、初始化脚本
│   ├── middleware/          # 鉴权、上传
│   ├── routes/              # auth / pets / records / admin
│   └── utils/               # 校验、文件、错误处理
├── data/                    # SQLite 数据文件（运行时生成，git 忽略）
├── uploads/                 # 上传图片（运行时生成，git 忽略）
└── vite.config.ts
```

## 数据存储与备份

- 数据库文件：`data/petcare.db`
- 上传图片：`uploads/pets/<宠物ID>/`
- 两者均已加入 `.gitignore`。迁移或备份时，同时复制 `data/` 与 `uploads/` 即可。

## 上传限制

- 仅支持 JPG / PNG / WEBP
- 单张最大 5MB
- 就医报告一次最多 6 张

## 注意事项与已知限制

- 依赖 Node.js 22.5+ 的内置 SQLite，低版本 Node 无法启动。
- 未接入短信或邮件服务，因此不提供找回密码；忘记密码需管理员在后台重置。
- 管理员对用户业务数据为只读，仅可执行账号管理操作（禁用/启用、重置密码、删除）；禁用用户后其已有登录态也会失效。
- 图片通过带登录态的接口访问，未登录直接访问图片地址会返回 401。
- 手机真机访问本地服务需与电脑处于同一局域网，并将 API 地址指向电脑 IP；课程验收可在浏览器中以 375px 宽度模拟。
- PWA 安装能力在 `localhost` 或 HTTPS 下生效。
- `node:sqlite` 目前仍标记为实验特性，不影响本项目功能。

## 代码仓库

https://github.com/zihao1125/petcare-course

## 说明

本项目为《生成式人工智能应用基础二》课程作业，开发过程中的需求确认、验收标准、AI 指令记录、问题处理与检查结果见 [Agent.md](./Agent.md)。
