"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, RefreshCw, Search, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API, type User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Sensor {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  last_audio_time: string | null;
}

const STATUS_OPTIONS = ['正常', '轻微漏水', '严重漏水', '传感器损坏'];

export default function SensorsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const user = await API.getCurrentUser();
        if (!user) {
          router.push('/');
          return;
        }
        if (user.role !== '管理员') {
          toast({ variant: 'destructive', title: '无权限', description: '仅管理员可管理传感器' });
          router.push('/dashboard');
          return;
        }
        setCurrentUser(user);
        await loadSensors();
      } catch {
        router.push('/');
      }
    };

    init();
  }, [router]);

  const loadSensors = async () => {
    try {
      setLoading(true);
      const data = await API.getSensors();
      setSensors(data as Sensor[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: '加载失败', description: error.message || '无法加载传感器列表' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (sensorId: number, status: string) => {
    try {
      setUpdatingId(sensorId);
      await API.updateSensorStatus(sensorId, status);
      setSensors((prev) => prev.map((sensor) => (sensor.id === sensorId ? { ...sensor, status } : sensor)));
      toast({ title: '更新成功', description: '传感器状态已更新' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: '更新失败', description: error.message || '无法更新传感器状态' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSensors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sensors;
    return sensors.filter((sensor) => {
      return (
        sensor.name.toLowerCase().includes(q) ||
        String(sensor.id).includes(q) ||
        (sensor.status || '').toLowerCase().includes(q)
      );
    });
  }, [searchQuery, sensors]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '正常':
        return 'bg-green-100 text-green-700';
      case '轻微漏水':
        return 'bg-yellow-100 text-yellow-700';
      case '严重漏水':
        return 'bg-red-100 text-red-700';
      case '传感器损坏':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回主页
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">传感器管理</h1>
          </div>
          <Button variant="outline" onClick={loadSensors} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-4 w-4" /> 传感器列表
            </CardTitle>
            <CardDescription>可搜索传感器并直接更新状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="搜索名称/状态/ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredSensors.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无符合条件的传感器</p>
            ) : (
              <div className="space-y-3">
                {filteredSensors.map((sensor) => (
                  <div key={sensor.id} className="border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {sensor.name}
                        <span className="text-xs text-muted-foreground">#{sensor.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(sensor.status || '未知')}`}>
                          {sensor.status || '未知'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        坐标：{sensor.latitude}, {sensor.longitude}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        最近音频：{sensor.last_audio_time ? format(new Date(sensor.last_audio_time), 'yyyy-MM-dd HH:mm:ss') : '暂无'}
                      </p>
                    </div>
                    <div className="w-full md:w-[220px]">
                      <Select
                        value={sensor.status || '正常'}
                        onValueChange={(value) => handleStatusChange(sensor.id, value)}
                        disabled={updatingId === sensor.id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
