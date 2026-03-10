"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { API, type User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Worker {
  id: number;
  username: string;
  full_name: string | null;
}

export default function CreateCommandPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await API.getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      if (user.role !== '管理员') {
        toast({ variant: "destructive", title: "无权限", description: "只有管理员可以创建命令" });
        router.push('/commands');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/');
    }
  };



  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments([...attachments, ...Array.from(files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      toast({ variant: "destructive", title: "请填写必填项", description: "标题和内容为必填项" });
      return;
    }

    setLoading(true);
    try {
      // 创建命令
      const { id } = await API.createCommand({
        title,
        content,
        deadline: deadline || undefined
      });

      // 上传附件
      if (attachments.length > 0) {
        await API.uploadCommandAttachments(id, attachments);
      }

      toast({ title: "创建成功", description: "命令已成功创建" });
      router.push('/commands');
    } catch (error: any) {
      toast({ variant: "destructive", title: "创建失败", description: error.message || "无法创建命令" });
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
          <h1 className="text-2xl md:text-3xl font-bold text-primary">创建命令</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>命令信息</CardTitle>
              <p className="text-muted-foreground">请填写命令的详细信息</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 标题 */}
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  placeholder="输入命令标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* 内容 */}
              <div className="space-y-2">
                <Label htmlFor="content">命令内容</Label>
                <Textarea
                  id="content"
                  placeholder="详细描述命令内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>



              {/* 截止时间 */}
              <div className="space-y-2">
                <Label htmlFor="deadline">截止时间</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              {/* 附件上传 */}
              <div className="space-y-4">
                <Label>附件</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded truncate w-20">
                          {attachment.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                      <FileText className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">添加附件</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAttachmentChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">支持上传多个附件，每个不超过30MB</p>
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
                {loading ? '创建中...' : '创建命令'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}