"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Users, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { API, type User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ParsedWorker {
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export default function WorkerManagePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchText, setBatchText] = useState('');

  useEffect(() => {
    const init = async () => {
      const user = await API.getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      if (user.role !== '管理员') {
        toast({ variant: 'destructive', title: '无权限', description: '仅管理员可管理工人账号' });
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
      await loadWorkers();
    };
    init();
  }, [router]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const users = await API.getUsers();
      setWorkers(users.filter(u => u.role === '工人'));
    } catch (error: any) {
      toast({ variant: 'destructive', title: '加载失败', description: error.message || '无法加载工人列表' });
    } finally {
      setLoading(false);
    }
  };

  const parsedWorkers = useMemo(() => {
    return batchText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map(v => v.trim());
        return {
          username: parts[0] || '',
          password: parts[1] || '',
          full_name: parts[2] || undefined,
          phone: parts[3] || undefined,
        } as ParsedWorker;
      });
  }, [batchText]);

  const handleBatchCreate = async () => {
    if (parsedWorkers.length === 0) {
      toast({ variant: 'destructive', title: '无可用数据', description: '请先输入批量账号内容' });
      return;
    }

    try {
      setLoading(true);
      const result = await API.batchRegisterWorkers(parsedWorkers);
      toast({
        title: '批量注册完成',
        description: `成功 ${result.successCount}，失败 ${result.failCount}`,
      });
      await loadWorkers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: '批量注册失败', description: error.message || '请求失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableWorker = async (id: number) => {
    try {
      setLoading(true);
      await API.deleteUser(id);
      toast({ title: '禁用成功', description: '工人账号已禁用' });
      await loadWorkers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: '禁用失败', description: error.message || '请求失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableWorker = async (id: number) => {
    try {
      setLoading(true);
      await API.setWorkerAccountStatus(id, '空闲');
      toast({ title: '启用成功', description: '工人账号已启用' });
      await loadWorkers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: '启用失败', description: error.message || '请求失败' });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> 返回仪表盘
          </Button>
          <h1 className="text-2xl font-bold text-primary">工人账号管理</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> 批量注册工人</CardTitle>
            <CardDescription>每行一个账号：用户名,密码,姓名(可选),电话(可选)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="batch-input">批量内容</Label>
            <Textarea
              id="batch-input"
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={'worker01,123456,张三,13800000001\nworker02,123456,李四,13800000002'}
            />
            <div className="flex justify-end">
              <Button onClick={handleBatchCreate} disabled={loading}>批量创建</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> 工人账号列表</CardTitle>
            <CardDescription>可查看并禁用/启用工人账号（禁用账号会被阻止登录）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无工人账号</p>
            ) : (
              workers.map(worker => (
                <div
                  key={worker.id}
                  className={`flex items-center justify-between border rounded-md p-3 ${worker.worker_status === '禁用' ? 'bg-muted/40 border-muted-foreground/30' : ''}`}
                >
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <span>{worker.full_name || worker.username}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${worker.worker_status === '禁用' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {worker.worker_status === '禁用' ? '已禁用' : '正常'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">账号：{worker.username} · 电话：{worker.phone || '未填写'}</p>
                  </div>
                  {worker.worker_status === '禁用' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleEnableWorker(worker.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> 启用
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleDisableWorker(worker.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> 禁用
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
