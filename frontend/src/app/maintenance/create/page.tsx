"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Save,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { API, type User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Sensor {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  last_audio_time: string | null;
}

export default function CreateMaintenancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sensorsLoading, setSensorsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    loadSensors();
  }, []);

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

  const loadSensors = async () => {
    try {
      setSensorsLoading(true);
      const data = await API.getSensors();
      setSensors(data as Sensor[]);
    } catch (error) {
      console.error('加载传感器失败:', error);
    } finally {
      setSensorsLoading(false);
    }
  };

  const handleSensorToggle = (sensorId: number) => {
    setSelectedSensors(prev => 
      prev.includes(sensorId)
        ? prev.filter(id => id !== sensorId)
        : [...prev, sensorId]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPhotos([...photos, ...Array.from(files)]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      toast({ variant: "destructive", title: "请填写必填项", description: "标题和检修内容为必填项" });
      return;
    }

    setLoading(true);
    try {
      // 准备传感器数据（可为空）
      const selectedSensorsData = sensors
        .filter(sensor => selectedSensors.includes(sensor.id))
        .map(sensor => ({ id: sensor.id, name: sensor.name }));

      // 创建检修记录（允许不关联传感器）
      const { id } = await API.createMaintenanceRecord({
        title,
        content,
        sensors: selectedSensorsData
      });

      // 上传照片
      if (photos.length > 0) {
        await API.uploadMaintenancePhotos(id, photos);
      }

      toast({ title: "创建成功", description: "检修记录已成功创建" });
      router.push('/maintenance');
    } catch (error: any) {
      toast({ variant: "destructive", title: "创建失败", description: error.message || "无法创建检修记录" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">创建检修记录</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>检修信息</CardTitle>
              <p className="text-muted-foreground">请填写检修记录的详细信息</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 标题 */}
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  placeholder="输入检修标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* 内容 */}
              <div className="space-y-2">
                <Label htmlFor="content">检修内容</Label>
                <Textarea
                  id="content"
                  placeholder="详细描述检修情况..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* 传感器选择 */}
              <div className="space-y-4">
                <Label>关联传感器</Label>
                {sensorsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sensors.map((sensor) => (
                      <div key={sensor.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sensor-${sensor.id}`}
                          checked={selectedSensors.includes(sensor.id)}
                          onCheckedChange={() => handleSensorToggle(sensor.id)}
                        />
                        <Label htmlFor={`sensor-${sensor.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{sensor.name}</span>
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${sensor.status === '正常' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {sensor.status}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 照片上传 */}
              <div className="space-y-4">
                <Label>现场照片</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                      <Camera className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">添加照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">支持上传多张照片，每张不超过20MB</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? '创建中...' : '创建记录'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}