import React, { useState, useEffect, useRef } from 'react'
import { Table, Card, Button, Modal, Form, Input, Select, message, Space, Drawer, Tabs, Tag, Row, Col, Statistic, Progress, Upload, Divider, Switch, DatePicker, Tooltip, Result, Alert } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, DownloadOutlined, RiseOutlined, UploadOutlined, LockOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons'
import { adminUserApi, adminApiClient } from '@/api'
import BackButton from '@/components/BackButton'
import { usePermission } from '@/utils/permission'
import { logAudit } from '@/utils/audit'

import './Users.css'

export default function Users() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined)
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend')
  const { canCreate, canUpdate, canDelete, hasFeature } = usePermission()
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // 用户等级配置（根据后端实际等级）
  const levelConfig: any = {
    'NORMAL': {
      color: '#8c8c8c',
      order: 1,
      icon: '👤',
      description: '普通会员',
      benefits: ['基础购物功能', '参与平台活动', '积累消费升级'],
      upgradeRequires: '新用户默认等级'
    },
    'VIP': { 
      color: '#f5222d', 
      order: 2, 
      icon: '💎',
      description: 'VIP会员',
      benefits: ['享受8折优惠', '优先客服支持', '每月赠送100通券'],
      upgradeRequires: '累计消费满1000元'
    },
    'STAR_1': { 
      color: '#faad14', 
      order: 3, 
      icon: '⭐',
      description: '一星店长',
      benefits: ['享受4折优惠', '专属销售工具', '每月赠送500通券'],
      upgradeRequires: '直推5人 + 团队销售额满5000元'
    },
    'STAR_2': { 
      color: '#13c2c2', 
      order: 4, 
      icon: '⭐⭐',
      description: '二星店长',
      benefits: ['享受3.5折优惠', '专属品牌合作', '每月赠送2000通券'],
      upgradeRequires: '直推10人 + 团队销售额满20000元'
    },
    'STAR_3': { 
      color: '#52c41a', 
      order: 5, 
      icon: '⭐⭐⭐',
      description: '三星店长',
      benefits: ['享受3折优惠', '独立门店运营权', '每月赠送5000通券'],
      upgradeRequires: '直推20人 + 团队销售额满50000元'
    },
    'STAR_4': { 
      color: '#1890ff', 
      order: 6, 
      icon: '⭐⭐⭐⭐',
      description: '四星店长',
      benefits: ['享受2.6折优惠', '城市代理权', '每月赠送10000通券'],
      upgradeRequires: '直推50人 + 团队销售额满200000元'
    },
    'STAR_5': { 
      color: '#722ed1', 
      order: 7, 
      icon: '⭐⭐⭐⭐⭐',
      description: '五星店长',
      benefits: ['享受2.4折优惠', '省级代理权', '每月赠送20000通券'],
      upgradeRequires: '直推100人 + 团队销售额满500000元'
    },
    'DIRECTOR': { 
      color: '#ff7a45', 
      order: 8, 
      icon: '👑',
      description: '董事',
      benefits: ['享受2.2折优惠', '全国代理权', '每月赠送50000通券'],
      upgradeRequires: '邀请500人 + 团队销售额满1000000元'
    },
  }

  const fetchUsers = async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      // 从后端API加载用户列表
      const response = await adminUserApi.getList({
        page,
        perPage: pageSize,
        search: searchText || undefined,
        level: filterLevel || undefined,
        sort: `${sortField}:${sortOrder === 'descend' ? -1 : 1}`,
      })

      console.log('API响应:', response)

      // 处理API响应 - 兼容多种响应格式
      let data = []
      let total = 0

      if (response?.success && response?.data) {
        // 标准响应格式: { success: true, data: { items: [...], total: 100 } }
        data = response.data.items || []
        total = response.data.total || 0
      } else if (response?.items) {
        // 直接包含items的格式: { items: [...], total: 100 }
        data = response.items || []
        total = response.total || 0
      } else if (Array.isArray(response)) {
        // 直接返回数组的格式: [...]
        data = response || []
        total = data.length
      } else if (response?.data && Array.isArray(response.data)) {
        // data是数组的格式: { data: [...] }
        data = response.data || []
        total = data.length
      } else {
        console.warn('未知的响应格式:', response)
        data = []
        total = 0
      }

      // 格式化用户数据
      const formattedUsers = (Array.isArray(data) ? data : []).map((user: any) => ({
        id: user.id,
        nickname: user.nickname || '未知',
        phone: user.phone || '-',
        level: user.level || 'NORMAL',
        openid: user.openid,
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-',
        pointsBalance: user.pointsBalance || 0,
        status: user.status || 'ACTIVE',
        ...user,
      }))

      console.log('格式化后的用户数据:', formattedUsers)

      setUsers(formattedUsers)
      setFilteredUsers(formattedUsers)
      setPagination({ current: page, pageSize, total })
    } catch (error: any) {
      console.error('加载用户列表失败:', error)

      // 使用API客户端提供的模拟数据
      const mockResponse = await adminUserApi.getList({
        page,
        perPage: pageSize,
        search: searchText || undefined,
        level: filterLevel || undefined,
      })

      if (mockResponse?.data?.items) {
        const formattedUsers = mockResponse.data.items.map((user: any) => ({
          id: user.id,
          nickname: user.nickname || '未知',
          phone: user.phone || '-',
          level: user.level || 'NORMAL',
          openid: user.openid,
          createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-',
          pointsBalance: user.pointsBalance || 0,
          status: user.status || 'ACTIVE',
          ...user,
        }))

        setUsers(formattedUsers)
        setFilteredUsers(formattedUsers)
        setPagination({
          current: page,
          pageSize,
          total: mockResponse.data.total || formattedUsers.length
        })

        message.info('当前使用模拟数据，请检查后端服务连接')
      } else {
        // 设置空数据以避免页面崩溃
        setUsers([])
        setFilteredUsers([])
        setPagination({ current: 1, pageSize: 20, total: 0 })
        message.error('无法加载用户数据')
      }
    } finally {
      setLoading(false)
    }
  }

  const [searchInput, setSearchInput] = useState('')
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // 检查权限并显示提示
  const checkPermission = (feature: string, actionName: string): boolean => {
    if (!hasFeature(feature)) {
      const errorMsg = `您没有${actionName}权限，请联系管理员`
      setPermissionError(errorMsg)
      message.error(errorMsg)
      logAudit({
        action: actionName,
        resource: 'User',
        resourceId: 'batch',
        details: { message: '权限检查失败' },
        status: 'failed',
        errorMessage: '权限不足',
      })
      return false
    }
    setPermissionError(null)
    return true
  }

  const handleBatchDelete = () => {
    if (!checkPermission('delete', '批量删除')) return
    
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户')
      return
    }
    Modal.confirm({
      title: `确定删除选中的 ${selectedRowKeys.length} 个用户吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true)
        try {
          // 批量删除每个用户
          for (const userId of selectedRowKeys) {
            try {
              await adminUserApi.delete(userId as string)
              logAudit({
                action: 'DELETE',
                resource: 'User',
                resourceId: userId as string,
                details: { action: 'delete_user' },
                status: 'success',
              })
            } catch (err) {
              console.error(`删除用户${userId}失败:`, err)
              logAudit({
                action: 'DELETE',
                resource: 'User',
                resourceId: userId as string,
                details: { action: 'delete_user' },
                status: 'failed',
                errorMessage: String(err),
              })
            }
          }
          message.success(`成功删除 ${selectedRowKeys.length} 个用户`)
          setSelectedRowKeys([])
          fetchUsers(pagination.current, pagination.pageSize)
        } catch (error: any) {
          message.error(error?.message || '批量删除失败')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleExport = () => {
    if (!checkPermission('export', '导出数据')) return
    
    try {
      // 导出CSV：姓名、手机、等级、通券
      const csvData = [
        ['姓名', '手机号', '用户等级', '通券余额'],
        ...filteredUsers.map(u => [u.nickname, u.phone, u.level, u.pointsBalance || 0])
      ]
      const csvString = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `用户列表_${new Date().toLocaleDateString()}.csv`
      link.click()
      message.success('导出成功')
      logAudit({
        action: 'EXPORT',
        resource: 'User',
        resourceId: 'list',
        details: { count: filteredUsers.length },
        status: 'success',
      })
    } catch (error) {
      message.error('导出失败')
      logAudit({
        action: 'EXPORT',
        resource: 'User',
        resourceId: 'list',
        details: { count: filteredUsers.length },
        status: 'failed',
        errorMessage: String(error),
      })
    }
  }

  useEffect(() => {
    // 页面加载时，初始化CSRF Token
    adminApiClient.initCSRFToken()
    // 加载初始数据
    fetchUsers(1, 20)
  }, [])

  const columns: any[] = [
    { 
      title: 'ID', 
      dataIndex: 'id', 
      key: 'id', 
      width: 100,
      render: (text: string) => text.substring(0, 8) + '...'
    },
    { 
      title: '昵称', 
      dataIndex: 'nickname', 
      key: 'nickname',
      width: 120,
    },
    { 
      title: '手机号', 
      dataIndex: 'phone', 
      key: 'phone', 
      width: 130 
    },
    {
      title: '用户等级',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: string) => {
        const config = levelConfig[level]
        return config ? (
          <Tag color={config.color}>{config.icon} {level}</Tag>
        ) : (
          <Tag>{level}</Tag>
        )
      },
    },
    { 
      title: '通券余额', 
      dataIndex: 'pointsBalance', 
      key: 'pointsBalance', 
      width: 100,
      render: (val: number) => `¥${(val || 0).toLocaleString()}`
    },
    { 
      title: '创建时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt', 
      width: 140,
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: any) => {
        const canEditUser = hasFeature('update')
        const canDeleteUser = hasFeature('delete')
        
        return (
          <Space size="small">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => showUserDetail(record)} />
            <Tooltip title={!canEditUser ? '您没有编辑权限' : ''}>
              <Button 
                type="text" 
                size="small" 
                icon={<EditOutlined />} 
                onClick={() => editUser(record)}
                disabled={!canEditUser}
              />
            </Tooltip>
            <Tooltip title={!canDeleteUser ? '您没有删除权限' : ''}>
              <Button 
                type="text" 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => deleteUser(record.id)}
                disabled={!canDeleteUser}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  const showUserDetail = (user: any) => {
    setSelectedUser(user)
    setDrawerVisible(true)
  }

  const editUser = (user: any) => {
    if (!checkPermission('update', '编辑')) return
    
    form.setFieldsValue({
      nickname: user.nickname,
      phone: user.phone,
      level: user.level,
      pointsBalance: user.pointsBalance,
      remarks: user.remarks || '',
      source: user.source || '',
      status: user.status || 'active',
      avatarUrl: user.avatarUrl || '',
    })
    setAvatarUrl(user.avatarUrl || '')
    setFileList(user.avatarUrl ? [{
      uid: '-1',
      name: 'avatar.png',
      status: 'done',
      url: user.avatarUrl,
    }] : [])
    setSelectedUser(user)
    setModalVisible(true)
  }

  // 头像上传前验证
  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp'
    if (!isJpgOrPng) {
      message.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片！')
      return false
    }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB！')
      return false
    }
    return true
  }

  // 处理头像上传
  const handleAvatarChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList)
    
    if (info.file.status === 'uploading') {
      setAvatarLoading(true)
      return
    }
    
    if (info.file.status === 'done') {
      // 从响应中获取图片URL
      const url = info.file.response?.data?.url || info.file.response?.url
      if (url) {
        setAvatarUrl(url)
        form.setFieldsValue({ avatarUrl: url })
        message.success('头像上传成功！')
      }
      setAvatarLoading(false)
    }
    
    if (info.file.status === 'error') {
      message.error('头像上传失败，请重试！')
      setAvatarLoading(false)
    }
  }

  // 直接使用Base64编码（无需后端上传接口）
  const handleAvatarUpload = (file: File) => {
    setAvatarLoading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setAvatarUrl(base64)
      form.setFieldsValue({ avatarUrl: base64 })
      setFileList([{
        uid: '-1',
        name: file.name,
        status: 'done',
        url: base64,
      }])
      setAvatarLoading(false)
      message.success('头像加载成功！')
    }
    reader.onerror = () => {
      message.error('头像加载失败！')
      setAvatarLoading(false)
    }
    reader.readAsDataURL(file)
    return false // 阻止自动上传
  }

  const deleteUser = (id: string) => {
    if (!checkPermission('delete', '删除')) return
    
    Modal.confirm({
      title: '确定删除该用户吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true)
        try {
          await adminUserApi.delete(id)
          message.success('删除成功')
          logAudit({
            action: 'DELETE',
            resource: 'User',
            resourceId: id,
            details: { action: 'delete_user' },
            status: 'success',
          })
          fetchUsers(pagination.current, pagination.pageSize)
        } catch (error: any) {
          console.error('删除用户失败:', error)
          message.error(error?.message || '删除失败')
          logAudit({
            action: 'DELETE',
            resource: 'User',
            resourceId: id,
            details: { action: 'delete_user' },
            status: 'failed',
            errorMessage: error?.message,
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const onFinish = async (values: any) => {
    if (selectedUser && !checkPermission('update', '编辑')) return
    if (!selectedUser && !checkPermission('create', '创建')) return
    
    setLoading(true)
    try {
      if (selectedUser) {
        // 更新用户
        const updateData = {
          nickname: values.nickname,
          phone: values.phone,
          level: values.level,
          pointsBalance: values.pointsBalance,
          remarks: values.remarks || '',
          source: values.source || '',
          status: values.status || 'active',
          avatarUrl: values.avatarUrl || '',
        }
        await adminUserApi.update(selectedUser.id, updateData)
        message.success('更新用户成功')
        logAudit({
          action: 'UPDATE',
          resource: 'User',
          resourceId: selectedUser.id,
          details: { nickname: values.nickname, level: values.level },
          status: 'success',
        })
      } else {
        // 创建新用户
        const createData = {
          nickname: values.nickname,
          phone: values.phone,
          avatarUrl: values.avatarUrl || '',
        }
        
        // 第一步：创建用户基础信息
        const createdUser = await adminUserApi.create(createData)
        const userId = createdUser?.id || createdUser?.user?.id
        
        if (userId) {
          // 第二步：更新用户等级、通券等其他信息
          const updateData = {
            level: values.level,
            pointsBalance: values.pointsBalance || 0,
            remarks: values.remarks || '',
            source: values.source || '',
            status: values.status || 'active',
          }
          
          // 如果有需要更新的字段，执行更新
          if (values.level || values.pointsBalance || values.remarks || values.source || values.status || values.realName || values.gender || values.birthDate) {
            await adminUserApi.update(userId, updateData)
          }
          
          message.success('创建用户成功')
          logAudit({
            action: 'CREATE',
            resource: 'User',
            resourceId: userId,
            details: { nickname: values.nickname, level: values.level, phone: values.phone },
            status: 'success',
          })
        } else {
          message.warning('用户创建成功，但无法获取用户ID，部分信息可能未保存')
        }
      }
      setModalVisible(false)
      form.resetFields()
      setSelectedUser(null)
      fetchUsers(pagination.current, pagination.pageSize) // 刷新列表
    } catch (error: any) {
      console.error('表单提交错误:', error)
      const errorMsg = error?.message || '操作失败'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="users-page fade-in-down">
      {/* 权限错误提示 */}
      {permissionError && (
        <Alert
          message="权限不足"
          description={permissionError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setPermissionError(null)}
        />
      )}
      
      {/* 页面头部 */}
      <div className="page-header">
        <BackButton fallback="/dashboard" />
        <h1 className="page-title">用户管理</h1>
      </div>

      {/* 统计卡片 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-with-shadow">
            <Statistic title="总用户数" value={pagination.total} suffix="人" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-with-shadow">
            <Statistic title="VIP以上" value={users.filter(u => ['VIP', 'STAR_1', 'STAR_2', 'STAR_3', 'STAR_4', 'STAR_5', 'DIRECTOR'].includes(u.level)).length} suffix="人" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-with-shadow">
            <Statistic title="通券总额" value={users.reduce((sum, u) => sum + (u.pointsBalance || 0), 0)} prefix="¥" valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-with-shadow">
            <Statistic title="加载状态" value={loading ? '加载中...' : '就绪'} valueStyle={{ color: loading ? '#faad14' : '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card className="card-with-shadow" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="搜索昵称或手机号"
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => {
                setSearchText(searchInput)
                fetchUsers(1, pagination.pageSize)
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="按等级筛选"
              allowClear
              value={filterLevel}
              onChange={(value) => {
                setFilterLevel(value)
                fetchUsers(1, pagination.pageSize)
              }}
              style={{ width: '100%' }}
              options={[
                { label: '普通会员 (NORMAL)', value: 'NORMAL' },
                { label: 'VIP', value: 'VIP' },
                { label: '一星 (STAR_1)', value: 'STAR_1' },
                { label: '二星 (STAR_2)', value: 'STAR_2' },
                { label: '三星 (STAR_3)', value: 'STAR_3' },
                { label: '四星 (STAR_4)', value: 'STAR_4' },
                { label: '五星 (STAR_5)', value: 'STAR_5' },
                { label: '董事 (DIRECTOR)', value: 'DIRECTOR' },
              ]}
            />
          </Col>
      {/* 新增和导出按钮的权限控制 */}
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Tooltip title={!canCreate() ? '您没有新增权限' : ''}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setSelectedUser(null)
                    form.resetFields()
                    setAvatarUrl('')
                    setFileList([])
                    setModalVisible(true)
                  }}
                  disabled={!canCreate()}
                >
                  新增
                </Button>
              </Tooltip>
              <Tooltip title={!hasFeature('export') ? '您没有导出权限' : ''}>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExport}
                  disabled={!hasFeature('export')}
                >
                  导出
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
        {selectedRowKeys.length > 0 && (
          <Row>
            <Col span={24}>
              <Button danger onClick={handleBatchDelete} style={{ marginBottom: 12 }}>
                删除选中 ({selectedRowKeys.length})
              </Button>
            </Col>
          </Row>
        )}
      </Card>

      {/* 用户列表 */}
      <Card className="card-with-shadow">
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={(pag, filters, sorter: any) => {
            if (sorter.field) {
              setSortField(sorter.field)
              setSortOrder(sorter.order === 'descend' ? 'descend' : 'ascend')
            }
            fetchUsers(pag.current || 1, pag.pageSize || pagination.pageSize)
          }}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={500}
      >
        {selectedUser && (
          <Tabs
            items={[
              {
                key: '1',
                label: '基本信息',
                children: (
                  <div>
                    {/* 头像 */}
                    {selectedUser.avatarUrl && (
                      <div style={{ marginBottom: 16, textAlign: 'center' }}>
                        <img 
                          src={selectedUser.avatarUrl} 
                          alt="头像" 
                          style={{ 
                            width: 100, 
                            height: 100, 
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #f0f0f0'
                          }} 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>昵称</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedUser.nickname}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>手机号</div>
                      <div>{selectedUser.phone}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>用户等级</div>
                      <div>
                        {levelConfig[selectedUser.level] ? (
                          <Tag color={levelConfig[selectedUser.level]?.color}>
                            {levelConfig[selectedUser.level]?.icon} {selectedUser.level}
                          </Tag>
                        ) : (
                          <Tag>{selectedUser.level}</Tag>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>账户状态</div>
                      <div>
                        <Tag color={selectedUser.status === 'active' ? 'green' : selectedUser.status === 'disabled' ? 'red' : 'orange'}>
                          {selectedUser.status === 'active' ? '正常' : selectedUser.status === 'disabled' ? '禁用' : '冻结'}
                        </Tag>
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>创建时间</div>
                      <div>{selectedUser.createdAt}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>OpenID</div>
                      <div style={{ fontSize: '12px', wordBreak: 'break-all', color: '#999' }}>{selectedUser.openid}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: '2',
                label: '财务信息',
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>通券余额</div>
                      <Statistic value={selectedUser.pointsBalance || 0} prefix="¥" valueStyle={{ color: '#faad14' }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>用户来源</div>
                      <div>
                        {selectedUser.source ? (
                          <Tag>
                            {selectedUser.source === 'referral' && '推荐邀请'}
                            {selectedUser.source === 'register' && '直接注册'}
                            {selectedUser.source === 'share' && '分享链接'}
                            {selectedUser.source === 'campaign' && '活动推广'}
                            {selectedUser.source === 'other' && '其他'}
                          </Tag>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: '3',
                label: '备注',
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>备注</div>
                      <div style={{ 
                        backgroundColor: '#fafafa',
                        padding: 12,
                        borderRadius: 4,
                        minHeight: 60,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {selectedUser.remarks || <span style={{ color: '#ccc' }}>无</span>}
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 编辑模态 */}
      <Modal
        title={selectedUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        width={700}
        loading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form 
          form={form} 
          onFinish={onFinish} 
          layout="vertical"
          autoComplete="off"
          initialValues={{
            status: 'active',
            pointsBalance: 0,
            gender: 'unknown'
          }}
        >
          {/* 基本信息Tab */}
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div style={{ paddingTop: 16 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="nickname" 
                          label="昵称" 
                          rules={[
                            { required: true, message: '请输入用户昵称' },
                            { min: 2, message: '昵称至少2个字符' },
                            { max: 20, message: '昵称最多20个字符' },
                            { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9]+$/, message: '昵称只能包含中文、英文和数字' },
                            { whitespace: true, message: '昵称不能只包含空格' }
                          ]}
                          hasFeedback
                          validateTrigger="onBlur"
                        >
                          <Input 
                            placeholder="输入用户昵称" 
                            maxLength={20}
                            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="realName" 
                          label="真实姓名"
                          rules={[
                            { max: 20, message: '姓名最多20个字符' },
                            { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文和空格' }
                          ]}
                        >
                          <Input 
                            placeholder="输入真实姓名（可选）" 
                            maxLength={20}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="phone" 
                          label="手机号" 
                          rules={[
                            { required: true, message: '请输入手机号' },
                            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的11位手机号' },
                            {
                              validator: async (_, value) => {
                                if (value && !/^1[3-9]\d{9}$/.test(value)) {
                                  throw new Error('手机号格式不正确，必须以1开头和11位数字')
                                }
                              }
                            }
                          ]}
                          hasFeedback
                          validateTrigger="onBlur"
                        >
                          <Input 
                            placeholder="输入11位手机号" 
                            type="tel" 
                            maxLength={11}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="email" 
                          label="邮箱地址"
                          rules={[
                            { type: 'email', message: '请输入有效的邮箱地址' },
                            { max: 100, message: '邮箱地址最多100个字符' }
                          ]}
                        >
                          <Input 
                            placeholder="输入邮箱地址（可选）" 
                            type="email"
                            maxLength={100}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="gender" 
                          label="性别"
                        >
                          <Select
                            placeholder="选择性别（可选）"
                            allowClear
                            options={[
                              { label: '男', value: 'male' },
                              { label: '女', value: 'female' },
                              { label: '保密', value: 'unknown' },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="birthDate" 
                          label="生日"
                        >
                          <DatePicker 
                            placeholder="选择生日（可选）" 
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item 
                      name="level" 
                      label="用户等级" 
                      rules={[{ required: true, message: '请选择用户等级' }]}
                    >
                      <Select
                        placeholder="选择用户等级"
                        options={[
                          { label: '普通会员 (NORMAL)', value: 'NORMAL' },
                          { label: 'VIP', value: 'VIP' },
                          { label: '一星 (STAR_1)', value: 'STAR_1' },
                          { label: '二星 (STAR_2)', value: 'STAR_2' },
                          { label: '三星 (STAR_3)', value: 'STAR_3' },
                          { label: '四星 (STAR_4)', value: 'STAR_4' },
                          { label: '五星 (STAR_5)', value: 'STAR_5' },
                          { label: '董事 (DIRECTOR)', value: 'DIRECTOR' },
                        ]}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="status" 
                      label="账户状态"
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder="选择账户状态"
                        options={[
                          { label: '正常', value: 'active' },
                          { label: '禁用', value: 'disabled' },
                          { label: '冻结', value: 'frozen' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                )
              },
              {
                key: 'financial',
                label: '财务信息',
                children: (
                  <div style={{ paddingTop: 16 }}>
                    <Form.Item 
                      name="pointsBalance" 
                      label="通券余额" 
                      rules={[
                        { required: true, message: '请输入通券余额' },
                        { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入有效的金额（最多2位小数）' }
                      ]}
                    >
                      <Input 
                        type="number" 
                        placeholder="输入通券余额" 
                        min={0}
                        step={0.01}
                        addonAfter="¥"
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="source" 
                      label="用户来源"
                      rules={[
                        { max: 50, message: '来源描述最多50个字符' }
                      ]}
                    >
                      <Select
                        placeholder="选择用户来源"
                        allowClear
                        options={[
                          { label: '推荐邀请', value: 'referral' },
                          { label: '直接注册', value: 'register' },
                          { label: '分享链接', value: 'share' },
                          { label: '活动推广', value: 'campaign' },
                          { label: '其他', value: 'other' },
                        ]}
                      />
                    </Form.Item>
                    
                    <div style={{ backgroundColor: '#fafafa', padding: 12, borderRadius: 4, marginBottom: 16 }}>
                      <p style={{ margin: 0, color: '#666', fontSize: 12 }}>💡 提示：通券为用户在平台上的虚拟资产，可用于兑换商品</p>
                    </div>
                  </div>
                )
              },
              {
                key: 'extra',
                label: '附加信息',
                children: (
                  <div style={{ paddingTop: 16 }}>
                    {/* 头像上传 */}
                    <Form.Item 
                      label="用户头像"
                      extra="支持 JPG/PNG/GIF/WEBP 格式，文件大小不超过 2MB"
                    >
                      <Upload
                        name="avatar"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        beforeUpload={beforeUpload}
                        customRequest={({ file }) => handleAvatarUpload(file as File)}
                      >
                        {avatarUrl || form.getFieldValue('avatarUrl') ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img 
                              src={avatarUrl || form.getFieldValue('avatarUrl')} 
                              alt="avatar" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div 
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.3s',
                                cursor: 'pointer'
                              }}
                              className="avatar-overlay"
                            >
                              <UploadOutlined style={{ fontSize: 24, color: '#fff' }} />
                            </div>
                          </div>
                        ) : (
                          <div>
                            {avatarLoading ? <LoadingOutlined /> : <UserOutlined style={{ fontSize: 32, color: '#999' }} />}
                            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>点击上传</div>
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
                    
                    <Form.Item 
                      name="avatarUrl" 
                      label="头像URL（可选）"
                      rules={[
                        {
                          validator: async (_, value) => {
                            if (!value) return // 可选字段，为空则通过
                            // 允许Base64格式
                            if (value.startsWith('data:image/')) {
                              return
                            }
                            // 允许HTTP/HTTPS URL
                            const urlPattern = /^https?:\/\/.+/
                            if (urlPattern.test(value)) {
                              return
                            }
                            throw new Error('请输入有效的URL或上传图片')
                          }
                        },
                        { max: 5000000, message: 'URL最多500万个字符（支持大型Base64图片）' }
                      ]}
                      extra="也可以直接输入头像图片链接"
                    >
                      <Input 
                        placeholder="输入头像图片URL" 
                        type="url"
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="remarks" 
                      label="备注" 
                      rules={[
                        { max: 200, message: '备注最多200个字符' }
                      ]}
                    >
                      <Input.TextArea 
                        placeholder="输入用户备注（可选）" 
                        rows={4}
                        maxLength={200}
                        showCount
                      />
                    </Form.Item>
                    
                    <Alert
                      message="提示"
                      description="头像可以通过上传本地图片或直接输入URL。上传的图片将会转换为Base64编码存储。"
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  </div>
                )
              }
            ]}
          />
        </Form>
      </Modal>
    </div>
  )
}
