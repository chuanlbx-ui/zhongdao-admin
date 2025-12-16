import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Spin } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { adminAuthApi } from '@/api'
import './Login.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      if (!values.username || !values.password) {
        message.error('请输入用户名和密码')
        return
      }
      
      // 尝试调用后端API
      let token: string | null = null
      let adminData: any = null
      let apiError: any = null
      
      try {
        const res: any = await adminAuthApi.login(values)
        // 解析响应数据
        token = res?.data?.tokens?.accessToken || res?.tokens?.accessToken || res?.token || res?.data?.token
        adminData = res?.data?.admin || res?.admin || res?.data?.user || res?.user
      } catch (err: any) {
        apiError = err
        console.error('API登录错误:', err)

        // 显示详细的错误信息
        if (err?.response) {
          console.error('错误响应:', {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers
          })
          message.error(`登录失败 (${err.response.status}): ${err.response.data?.message || '服务器错误'}`)
        } else if (err?.request) {
          message.error('无法连接到服务器，请检查后端服务是否运行在 http://localhost:3000')
        } else {
          message.error(`登录失败: ${err.message}`)
        }
        return
      }
  
      if (!token) {
        message.error('登录失败：无效的用户名或密码')
        return
      }
      
      setToken(String(token))
      setUser({
        id: String(adminData?.id || values.username),
        username: String(adminData?.username || values.username),
        email: String(adminData?.email || `${values.username}@zhongdao.com`),
        role: String(adminData?.role || 'ADMIN'),
      })
      
      message.success('登录成功')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('登录异常:', error)
      message.error(error?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <Card className="login-card" variant="borderless">
          <div className="login-header">
            <h1>中道商城</h1>
            <p>管理后台登录</p>
          </div>

          <Form onFinish={onFinish} layout="vertical">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                placeholder="用户名"
                prefix={<UserOutlined />}
                size="large"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                placeholder="密码"
                prefix={<LockOutlined />}
                size="large"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>

            <div className="login-tips">
              <p>系统管理员：admin / admin123456</p>
              <p>或使用微信扫码登录</p>
            </div>
          </Form>
        </Card>
      </div>

      <Spin spinning={loading} style={{ position: 'absolute', right: 50, top: 50 }} />
    </div>
  )
}
