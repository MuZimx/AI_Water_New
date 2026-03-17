"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Camera,
  Save,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { API, FILE_BASE_URL, type User as ApiUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Command {
  id: number;
  admin_id: number;
  title: string;
  content: string;
  deadline: string | null;
  created_at: string;
  admin_name: string;
  recipient_status?: string;
  recipients?: Array<{
    id: number;
    user_id: number;
    status: string;
    read_at: string | null;
    completed_at: string | null;
    username: string;
  }>;
  attachments?: Array<{
    id: number;
    filename: string;
    original_name: string;
    upload_time: string;
  }>;
  feedback?: {
    id: number;
    content: string;
    created_at: string;
    photos?: Array<{
      id: number;
      filename: string;
      original_name: string;
      upload_time: string;
    }>;
  };
  feedbacks?: Array<{
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    username: string;
    photos?: Array<{
      id: number;
      filename: string;
      original_name: string;
      upload_time: string;
    }>;
  }>;
}

function CommandDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [command, setCommand] = useState<Command | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackPhotos, setFeedbackPhotos] = useState<File[]>([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const commandId = searchParams.get('id');

  useEffect(() => {
    if (!commandId) {
      toast({ variant: "destructive", title: "参数错误", description: "缺少命令 ID" });
      router.push('/commands');
      return;
    }

    loadUser();
  }, [commandId]);

  const loadUser = async () => {
    try {
      const user = await API.getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);
      loadCommand();
    } catch {
      router.push('/');
    }
  };

  const loadCommand = async () => {
    try {
      setLoading(true);
      const id = Number(commandId);
      if (!Number.isFinite(id)) {
        throw new Error('无效的命令 ID');
      }

      const data = await API.getCommand(id);
      setCommand(data);
      setStatus(data.recipient_status || '未执行');
    } catch (error: any) {
      toast({ variant: "destructive", title: "加载失败", description: error.message || "无法加载命令" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!command) return;

    setUpdatingStatus(true);
    try {
      await API.updateCommandStatus(command.id, status);
      toast({ title: "更新成功", description: "状态已成功更新" });
      loadCommand(); // 重新加载命令
    } catch (error: any) {
      toast({ variant: "destructive", title: "更新失败", description: error.message || "无法更新状态" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFeedbackPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFeedbackPhotos([...feedbackPhotos, ...Array.from(files)]);
    }
  };

  const handleRemoveFeedbackPhoto = (index: number) => {
    setFeedbackPhotos(feedbackPhotos.filter((_, i) => i !== index));
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !feedbackContent) {
      toast({ variant: "destructive", title: "请填写反馈内容" });
      return;
    }

    setSubmittingFeedback(true);
    try {
      // 提交反馈
      const { id: feedbackId } = await API.submitCommandFeedback(command.id, feedbackContent);

      // 上传反馈照片
      if (feedbackPhotos.length > 0) {
        await API.uploadCommandFeedbackPhotos(command.id, feedbackPhotos);
      }

      toast({ title: "提交成功", description: "反馈已成功提交" });
      setFeedbackContent('');
      setFeedbackPhotos([]);
      loadCommand(); // 重新加载命令
    } catch (error: any) {
      toast({ variant: "destructive", title: "提交失败", description: error.message || "无法提交反馈" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '未执行':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case '已完成':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '未执行':
        return 'bg-yellow-100 text-yellow-800';
      case '已完成':
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

  if (!command) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">命令不存在</p>
          <Button onClick={() => router.push('/commands')}>
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
            onClick={() => router.push('/commands')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">命令详情</h1>
        </div>

        {/* 基本信息 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start justify-center">
              <CardTitle className="text-xl">{command.title}</CardTitle>
              <span className={`flex items-center px-3 py-1 text-sm rounded-full ${getStatusColor(command.recipient_status || '未执行')}`}>
                {getStatusIcon(command.recipient_status || '未执行')}
                <span className="ml-1">{command.recipient_status || '未执行'}</span>
              </span>
              {currentUser?.role !== '管理员' && command.recipient_status !== '已完成' && (
                <div className="w-[200px]">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="更新状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="未执行">未执行</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">发布人：{command.admin_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">发布时间：{format(new Date(command.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
              {command.deadline && (
                <div className="flex items-center gap-2 text-red-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">截止时间：{format(new Date(command.deadline), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium mb-2">命令内容</h3>
              <p className="text-muted-foreground whitespace-pre-line">{command.content}</p>
            </div>
          </CardContent>
          {currentUser?.role !== '管理员' && command.recipient_status !== '已完成' && (
            <CardContent className="border-t">
              <Button
                onClick={handleStatusUpdate}
                className="bg-primary hover:bg-primary/90"
                disabled={updatingStatus || status === (command.recipient_status || '未执行')}
              >
                {updatingStatus ? '更新中...' : '更新状态'}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* 附件 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>附件</CardTitle>
          </CardHeader>
          <CardContent>
            {command.attachments?.length === 0 ? (
              <p className="text-muted-foreground">无附件</p>
            ) : (
              <div className="space-y-2">
                {command.attachments?.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{attachment.original_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(attachment.upload_time), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                    <a 
                      href={`${FILE_BASE_URL}/uploads/commands/${attachment.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      下载
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 接收者状态（管理员视图） */}
        {currentUser?.role === '管理员' && command.recipients && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>接收者状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {command.recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span>{recipient.username}</span>
                    </div>
                    <span className={`flex items-center px-3 py-1 text-sm rounded-full ${getStatusColor(recipient.status === '已完成' ? '已完成' : recipient.status)}`}>
                      {getStatusIcon(recipient.status === '已完成' ? '已完成' : recipient.status)}
                      <span className="ml-1">{recipient.status === '已完成' ? '已完成' : recipient.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 反馈（工人视图） */}
        {currentUser?.role !== '管理员' && !command.feedback && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>提交反馈</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feedback-content">反馈内容</Label>
                    <Textarea
                      id="feedback-content"
                      placeholder="请输入执行反馈..."
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>反馈照片</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-3">
                        {feedbackPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Photo ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFeedbackPhoto(index)}
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
                            onChange={handleFeedbackPhotoChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">支持上传多张照片，每张不超过20MB</p>
                    </div>
                  </div>
                </div>
                <CardFooter className="mt-4">
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90"
                    disabled={submittingFeedback}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {submittingFeedback ? '提交中...' : '提交反馈'}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 反馈记录（管理员视图） */}
        {currentUser?.role === '管理员' && command.feedbacks && command.feedbacks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>反馈记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {command.feedbacks.map((feedback) => (
                  <div key={feedback.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{feedback.username}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(feedback.created_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">{feedback.content}</p>
                    {feedback.photos && feedback.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {feedback.photos.map((photo) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={photo.filename.startsWith('feedback-')
                                ? `${FILE_BASE_URL}/uploads/command_feedback/${photo.filename}`
                                : `${FILE_BASE_URL}/uploads/maintenance/${photo.filename}`}
                              alt={photo.original_name}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded truncate w-24">
                              {photo.original_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 我的反馈（工人视图） */}
        {currentUser?.role !== '管理员' && command.feedback && (
          <Card>
            <CardHeader>
              <CardTitle>我的反馈</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{currentUser?.username || '-'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(command.feedback.created_at), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">{command.feedback.content}</p>
                {command.feedback.photos && command.feedback.photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {command.feedback.photos.map((photo) => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.filename.startsWith('feedback-')
                            ? `${FILE_BASE_URL}/uploads/command_feedback/${photo.filename}`
                            : `${FILE_BASE_URL}/uploads/maintenance/${photo.filename}`}
                          alt={photo.original_name}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded truncate w-24">
                          {photo.original_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function CommandDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      }
    >
      <CommandDetailContent />
    </Suspense>
  );
}