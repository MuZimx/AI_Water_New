"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, Shield, Cpu, Lock, Waves, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { API } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isInit, setIsInit] = useState<boolean | null>(null); // null: 检查中, true: 需要初始化, false: 已初始化
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // 先检查是否已登录
        const user = await API.getCurrentUser();
        if (user) {
          router.push('/dashboard');
          return;
        }
        // 检查系统是否已初始化
        const initStatus = await API.checkInitStatus();
        setIsInit(!initStatus.initialized);
      } catch {
        // 发生错误时，默认显示登录
        setIsInit(false);
      }
    };
    checkStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isInit) {
        // 初始化管理员账户
        await API.initAdmin({ username, password });
        toast({
          title: "系统初始化成功",
          description: "管理员账户已成功创建，请使用该账户登录。"
        });
        setIsInit(false);
      } else {
        // 普通登录
        await API.login({ username, password });
        toast({ title: "欢迎回来", description: `已登录为 ${username}` });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "操作失败",
        description: error.message || "认证过程出错，请重试。"
      });
    } finally {
      setLoading(false);
    }
  };

  // 如果还在检查初始化状态，显示加载
  if (isInit === null) {
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
      {/* 背景装饰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full" />
              <div className="relative bg-white border border-secondary/20 p-4 rounded-2xl shadow-xl flex items-center justify-center">
                <Waves className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">AI Water</h1>
          <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
            智能水务基础设施监控系统
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
              {isInit ? <UserPlus className="h-5 w-5 text-secondary" /> : <LogIn className="h-5 w-5 text-secondary" />}
              {isInit ? '系统初始化' : '操作员访问'}
            </CardTitle>
            <CardDescription>
              {isInit
                ? '首次使用需要创建管理员账户，该账户将拥有系统所有权限。'
                : '输入您的凭据以访问异常检测控制面板。'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{isInit ? '管理员用户名' : '用户名'}</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder={isInit ? "例如：admin" : "例如：admin_operator"}
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
                {loading ? '处理中...' : (isInit ? '创建管理员' : '验证登录')}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Droplets, label: '实时监控' },
            { icon: Cpu, label: 'AI 检测' },
            { icon: Lock, label: '安全传输' }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/40 border border-white/60 shadow-sm">
              <item.icon className="h-5 w-5 text-secondary" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
