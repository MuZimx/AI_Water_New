"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { API } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'工人' | '管理员'>('工人');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.register({ username, password, full_name: fullName, phone, role });
      toast({ title: '注册成功', description: '账户已创建，请登录或已自动登录。' });
      router.push('/');
    } catch (err: any) {
      toast({ variant: 'destructive', title: '注册失败', description: err.message || '请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-white to-background">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
              <UserPlus className="h-5 w-5 text-secondary" /> 注册新账户
            </CardTitle>
            <CardDescription>填写信息完成注册。请选择角色（工人 / 管理员）。</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <Input id="username" placeholder="请输入用户名" required value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-11" />
                  <Shield className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">真实姓名（可选）</Label>
                <Input id="fullName" placeholder="姓名" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">电话（可选）</Label>
                <Input id="phone" placeholder="手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <select id="role" aria-label="角色" className="w-full border rounded-md h-10 px-3" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="工人">工人</option>
                  <option value="管理员">管理员</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-lg" disabled={loading}>
                {loading ? '提交中...' : '注册并登录'}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
