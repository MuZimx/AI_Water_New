"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Shield, UserPlus, Waves } from 'lucide-react';
import { API } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function InitAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkInitStatus = async () => {
      try {
        const initStatus = await API.checkInitStatus();
        if (initStatus.initialized) {
          router.replace('/');
          return;
        }
      } catch {
        toast({
          variant: 'destructive',
          title: '状态检查失败',
          description: '无法获取系统初始化状态，请检查后端服务。'
        });
      } finally {
        setChecking(false);
      }
    };

    checkInitStatus();
  }, [router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await API.initAdmin({ username, password });
      toast({
        title: '系统初始化成功',
        description: '管理员账户已创建，请登录系统。'
      });
      router.replace('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '初始化失败',
        description: error.message || '请稍后重试。'
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-white to-background">
        <div className="text-center space-y-4">
          <Waves className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-white to-background overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="w-full max-w-md relative z-10">
        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
              <UserPlus className="h-5 w-5 text-secondary" />
              系统初始化
            </CardTitle>
            <CardDescription>
              首次使用需要创建管理员账户，该账户将拥有系统所有权限。
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">管理员用户名</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="例如：admin"
                    className="pl-9 h-11"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <Shield className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">安全令牌</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-11"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-lg" disabled={loading}>
                {loading ? '处理中...' : '创建管理员'}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}