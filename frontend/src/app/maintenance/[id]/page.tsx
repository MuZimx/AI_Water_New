"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Camera,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API, type User as TUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MaintenanceRecord {
  id: number;
  user_id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
  sensors: Array<{
    id: number;
    sensor_id: number;
    sensor_name: string;
  }>;
  photos: Array<{
    id: number;
    filename: string;
    original_name: string;
    upload_time: string;
  }>;
}

export default function MaintenanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<TUser | null>(null);
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const recordId = params.id as string;

  useEffect(() => {
    loadUser();
    loadRecord();
  }, [recordId]);

  const loadUser = async () => {
    try {
      const user = await API.getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/');
    }
  };

  const loadRecord = async () => {
    try {
      setLoading(true);
      const data = await API.getMaintenanceRecord(parseInt(recordId));
      setRecord(data);
      setStatus(data.status);
    } catch (error: any) {
      toast({ variant: "destructive", title: "加载失败", description: error.message || "无法加载检修记录" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!record) return;

    setUpdatingStatus(true);
    try {
      await API.updateMaintenanceStatus(record.id, status);
      toast({ title: "更新成功", description: "状态已成功更新" });
      loadRecord(); // 重新加载记录
    } catch (error: any) {
      toast({ variant: "destructive", title: "更新失败", description: error.message || "无法更新状态" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '未读':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case '已读':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '未读':
        return 'bg-yellow-100 text-yellow-800';
      case '已读':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">检修记录不存在</p>
          <Button onClick={() => router.push('/maintenance')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/maintenance')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">检修记录详情</h1>
        </div>

        {/* 基本信息 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{record.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`flex items-center px-3 py-1 text-sm rounded-full ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span className="ml-1">{record.status}</span>
                  </span>
                </div>
              </div>
              {currentUser?.role === '管理员' || currentUser?.id === record.user_id ? (
                <div className="w-[200px]">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="更新状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="未读">未读</SelectItem>
                      <SelectItem value="已读">已读</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">创建人：{record.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">创建时间：{format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">更新时间：{format(new Date(record.updated_at), 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">检修内容</h3>
              <p className="text-muted-foreground whitespace-pre-line">{record.content}</p>
            </div>
          </CardContent>
          {currentUser?.role === '管理员' || currentUser?.id === record.user_id ? (
            <CardContent>
              <Button 
                onClick={handleStatusUpdate}
                className="bg-primary hover:bg-primary/90"
                disabled={updatingStatus || status === record.status}
              >
                {updatingStatus ? '更新中...' : '更新状态'}
              </Button>
            </CardContent>
          ) : null}
        </Card>

        {/* 关联传感器 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>关联传感器</CardTitle>
          </CardHeader>
          <CardContent>
            {record.sensors.length === 0 ? (
              <p className="text-muted-foreground">无关联传感器</p>
            ) : (
              <div className="space-y-2">
                {record.sensors.map((sensor) => (
                  <div key={sensor.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{sensor.sensor_name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 现场照片 */}
        <Card>
          <CardHeader>
            <CardTitle>现场照片</CardTitle>
          </CardHeader>
          <CardContent>
            {record.photos.length === 0 ? (
              <p className="text-muted-foreground">无现场照片</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {record.photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={`http://localhost:3001/uploads/maintenance/${photo.filename}`}
                      alt={photo.original_name}
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {photo.original_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}