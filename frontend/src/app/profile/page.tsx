"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, ArrowLeft, Save, User, UserCog, History, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { API, type User as UserType } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await API.getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }
        setUser(currentUser);
      } catch {
        router.push('/');
      }
    };
    loadUser();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "不匹配", description: "新令牌输入不一致。" });
      return;
    }

    setLoading(true);
    // 模拟
    setTimeout(() => {
      setLoading(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: "安全设置已更新", description: "您的操作员访问令牌已成功轮换。" });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            返回仪表板
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <UserCog className="h-5 w-5" />
            <h1 className="text-xl font-headline font-bold">操作员设置</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <Card className="bg-primary text-white border-none shadow-xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <User className="h-24 w-24" />
               </div>
               <CardHeader>
                 <CardTitle className="font-headline">身份档案</CardTitle>
                 <CardDescription className="text-white/60">已验证的监控人员</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4 relative z-10">
                  <div className="flex flex-col items-center py-4">
                    <div className="h-20 w-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-3xl font-bold shadow-inner mb-3">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-lg font-bold">{user?.username}</p>
                    <p className="text-xs font-medium text-white/50 tracking-widest uppercase mt-1">身份：首席操作员</p>
                  </div>
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">操作员 ID</span>
                      <span className="font-mono">{user?.id ? String(user.id).slice(0, 8) : 'Loading'}...</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">上次轮换</span>
                      <span>2024年3月14日</span>
                    </div>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-headline flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  活动历史
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { action: '会话已启动', time: '2 分钟前' },
                  { action: '分析已完成', time: '1 小时前' },
                  { action: '文件已删除', time: '昨天' }
                ].map((log, i) => (
                  <div key={i} className="flex justify-between items-center text-xs pb-2 border-b border-muted last:border-0 last:pb-0">
                    <span className="text-foreground/80 font-medium">{log.action}</span>
                    <span className="text-muted-foreground">{log.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="shadow-lg border-none">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="font-headline flex items-center gap-2 text-lg">
                  <Key className="h-5 w-5 text-secondary" />
                  安全协议
                </CardTitle>
                <CardDescription>更新您的操作员安全令牌以维护基础设施完整性。</CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="old">当前安全令牌</Label>
                      <div className="relative">
                        <Input 
                          id="old" 
                          type="password" 
                          className="pl-9" 
                          required
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                        />
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new">新令牌</Label>
                        <Input 
                          id="new" 
                          type="password" 
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">确认新令牌</Label>
                        <Input 
                          id="confirm" 
                          type="password" 
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <Shield className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>安全策略：</strong> 令牌长度应至少为 8 个字符，并包含多种特殊字符。请避免使用顺序的基础设施 ID。
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-6">
                  <Button type="submit" className="ml-auto bg-primary hover:bg-primary/90" disabled={loading}>
                    {loading ? '正在轮换令牌...' : '更新安全协议'}
                    {!loading && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
