# 前后端集成指南

## 概述

后端提供 Google OAuth 登录和基于 Cookie 的会话管理。前端通过简单的重定向和 API 调用即可完成用户认证。

## 认证流程

```
┌─────────┐      ┌─────────┐      ┌────────┐      ┌─────────┐
│ 前端    │      │ 后端    │      │ Google │      │ 前端    │
│ 页面    │      │ API     │      │ OAuth  │      │ 应用    │
└────┬────┘      └────┬────┘      └───┬────┘      └────┬────┘
     │                │                │                │
     │ 1. 点击登录    │                │                │
     ├───────────────>│                │                │
     │                │                │                │
     │ 2. 重定向到    │                │                │
     │    /auth/google│                │                │
     │<───────────────┤                │                │
     │                │                │                │
     │ 3. 重定向到 Google               │                │
     │                ├───────────────>│                │
     │                │                │                │
     │ 4. 用户授权    │                │                │
     │                │                │                │
     │ 5. Google 回调 │                │                │
     │                │<───────────────┤                │
     │                │                │                │
     │ 6. 设置 Cookie │                │                │
     │    重定向回前端│                │                │
     │<───────────────┤                │                │
     │                │                │                │
     │ 7. 获取用户信息│                │                │
     ├───────────────>│                │                │
     │                │                │                │
     │ 8. 返回用户数据│                │                │
     │<───────────────┤                │                │
```

## 前端实现方案

### 方案 1: 简单重定向（推荐用于传统 Web 应用）

#### 登录按钮

```html
<!-- HTML -->
<button onclick="window.location.href='http://localhost:4000/auth/google'">
  使用 Google 登录
</button>
```

```jsx
// React
function LoginButton() {
  const handleLogin = () => {
    // 保存当前页面路径，登录后返回
    const currentPath = window.location.pathname;
    window.location.href = `http://localhost:4000/auth/google?redirect=${encodeURIComponent(currentPath)}`;
  };

  return (
    <button onClick={handleLogin}>
      使用 Google 登录
    </button>
  );
}
```

```vue
<!-- Vue 3 -->
<template>
  <button @click="handleLogin">使用 Google 登录</button>
</template>

<script setup>
const handleLogin = () => {
  const currentPath = window.location.pathname;
  window.location.href = `http://localhost:4000/auth/google?redirect=${encodeURIComponent(currentPath)}`;
};
</script>
```

#### 登出按钮

```jsx
// React
function LogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/auth/logout', {
        method: 'POST',
        credentials: 'include', // 重要：发送 Cookie
      });
      // 刷新页面或重定向到首页
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return <button onClick={handleLogout}>登出</button>;
}
```

#### 获取当前用户信息

```jsx
// React Hook
import { useState, useEffect } from 'react';

function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/auth/me', {
      credentials: 'include', // 重要：发送 Cookie
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

// 使用示例
function App() {
  const { user, loading } = useCurrentUser();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <img src={user.picture} alt={user.name} />
          <p>欢迎, {user.name}</p>
          <LogoutButton />
        </div>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}
```

### 方案 2: 弹窗登录（推荐用于 SPA）

```jsx
// React
function LoginWithPopup() {
  const handleLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      'http://localhost:4000/auth/google',
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // 监听弹窗关闭
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        // 弹窗关闭后，刷新用户状态
        window.location.reload();
      }
    }, 500);
  };

  return <button onClick={handleLogin}>使用 Google 登录</button>;
}
```

### 方案 3: 使用 Axios/Fetch 调用 API

```jsx
// React + Axios
import axios from 'axios';

// 配置 Axios 实例
const api = axios.create({
  baseURL: 'http://localhost:4000',
  withCredentials: true, // 重要：发送 Cookie
});

// 获取用户信息
export const getCurrentUser = async () => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (error) {
    return null;
  }
};

// 登出
export const logout = async () => {
  await api.post('/auth/logout');
};

// 调用受保护的 API
export const getReport = async (id) => {
  const { data } = await api.get(`/api/report/${id}`);
  return data;
};
```

## 需要添加的后端 API 端点

### 1. 获取当前用户信息 `GET /auth/me`

返回当前登录用户的信息（从 JWT Cookie 解析）。

### 2. CORS 配置

前后端分离时，需要配置 CORS 允许前端域名访问。

## 环境配置

### 开发环境

```bash
# 后端 .env
BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

### 生产环境

```bash
# 后端 .env
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## CORS 和 Cookie 注意事项

### 同域部署（推荐）

- 前端：`https://yourdomain.com`
- 后端：`https://yourdomain.com/api`

使用反向代理（Nginx/Caddy）将前后端部署在同一域名下，无需 CORS 配置。

### 跨域部署

- 前端：`https://app.yourdomain.com`
- 后端：`https://api.yourdomain.com`

需要配置 CORS 和 Cookie 的 `sameSite` 属性。

## 完整示例

### React 完整示例

```jsx
// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:4000';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// src/App.jsx
import { AuthProvider, useAuth } from './contexts/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  return (
    <div>
      <h1>请登录</h1>
      <button onClick={login}>使用 Google 登录</button>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div>
      <h1>欢迎, {user.name}!</h1>
      <img src={user.picture} alt={user.name} />
      <p>Email: {user.email}</p>
      <button onClick={logout}>登出</button>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return user ? <Dashboard /> : <LoginPage />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
```

### Vue 3 完整示例

```vue
<!-- src/composables/useAuth.js -->
<script>
import { ref, onMounted } from 'vue';

const API_BASE = 'http://localhost:4000';

export function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        user.value = await res.json();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      loading.value = false;
    }
  };

  const login = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      user.value = null;
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  onMounted(checkAuth);

  return { user, loading, login, logout };
}
</script>

<!-- src/App.vue -->
<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="user">
    <h1>欢迎, {{ user.name }}!</h1>
    <img :src="user.picture" :alt="user.name" />
    <p>Email: {{ user.email }}</p>
    <button @click="logout">登出</button>
  </div>
  <div v-else>
    <h1>请登录</h1>
    <button @click="login">使用 Google 登录</button>
  </div>
</template>

<script setup>
import { useAuth } from './composables/useAuth';

const { user, loading, login, logout } = useAuth();
</script>
```

## 调试技巧

### 检查 Cookie 是否设置

1. 打开浏览器开发者工具
2. Application/存储 → Cookies
3. 查找 `session` Cookie

### 检查请求是否携带 Cookie

1. Network 标签
2. 查看请求头中的 `Cookie` 字段
3. 确保 `credentials: 'include'` 已设置

### 常见问题

**问题**: Cookie 未发送到后端
- **原因**: 未设置 `credentials: 'include'` 或 `withCredentials: true`
- **解决**: 在所有 fetch/axios 请求中添加该配置

**问题**: CORS 错误
- **原因**: 后端未配置 CORS 或配置不正确
- **解决**: 添加 `@fastify/cors` 插件并配置允许的源

**问题**: Cookie 在跨域时不工作
- **原因**: `sameSite` 设置为 `strict` 或浏览器阻止第三方 Cookie
- **解决**: 使用同域部署或设置 `sameSite: 'none'` + `secure: true`（仅 HTTPS）
