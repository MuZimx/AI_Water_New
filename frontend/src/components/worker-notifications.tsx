"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  ImagePlus,
  Check,
  X
} from 'lucide-react';
import { API } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Command {
  id: number;
  command_number: string;
  title: string;
  content: string;
  status: string;
  recipient_status?: string;
  deadline: string | null;
  created_at: string;
  read_status: number;
  feedback: string;
  response_time: string;
  completed_at?: string | null;
  photos?: string[];
  sensor_id?: number | null;
  sensor_status?: string;
}

interface WorkerNotificationsProps {
  currentUser: any;
  onStatusChange?: () => void;
  onRefreshSensors?: () => void;
  fromBanner?: boolean;
  inDialog?: boolean;
}

export function WorkerNotifications({ currentUser, onStatusChange, onRefreshSensors, fromBanner, inDialog }: WorkerNotificationsProps) {
  const { toast } = useToast();
  const [commands, setCommands] = useState<Command[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [updateSensor, setUpdateSensor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCommandStatus = (command: Command) => command.recipient_status || command.status;

  const isCommandCompleted = (command: Command) => {
    const effectiveStatus = getCommandStatus(command);
    return effectiveStatus === '已完成' || Boolean(command.completed_at);
  };

  useEffect(() => {
    if (currentUser?.role === '工人') {
      loadCommands();
      // 30秒轮询一次
      const interval = setInterval(loadCommands, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // 从横幅或弹窗进入时，自动选择待处理的指令
  useEffect(() => {
    if ((fromBanner || inDialog) && selectedCommand === null && commands.length > 0) {
      const pendingCommand = commands.find(cmd => !isCommandCompleted(cmd) && getCommandStatus(cmd) !== '已取消') || commands[0];
      if (pendingCommand) {
        setSelectedCommand(pendingCommand);
      }
    }
    // 退出横幅模式或弹窗模式时，清空选中的指令
    if (!fromBanner && !inDialog && selectedCommand !== null) {
      setSelectedCommand(null);
    }
  }, [fromBanner, inDialog, commands]); // 移除 selectedCommand 依赖避免无限循环

  const loadCommands = async () => {
    try {
      const commandsData = await (API as any).getReceivedCommands();
      setCommands(commandsData);
    } catch (error) {
      console.error('加载指令失败:', error);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({ variant: "destructive", title: "图片数量超限", description: "最多上传5张图片" });
      return;
    }
    if (selectedPhotos.length + files.length > 5) {
      toast({ variant: "destructive", title: "图片数量超限", description: "总共最多上传5张图片" });
      return;
    }

    const newPhotos = [...selectedPhotos, ...files];
    setSelectedPhotos(newPhotos);

    // 生成预览
    const newPreviews = [...photoPreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setPhotoPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setSelectedPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedCommand) return;

    setIsSubmitting(true);
    try {
      await (API as any).submitFeedback(
        selectedCommand.id,
        feedback,
        selectedPhotos.length > 0 ? selectedPhotos : undefined,
        updateSensor
      );
      toast({ title: "提交成功", description: "维修反馈已提交" });
      setFeedback('');
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      setUpdateSensor(false);
      loadCommands();
      setSelectedCommand(null);
      // 通知父组件刷新工人状态和传感器数据
      if (onStatusChange) {
        onStatusChange();
      }
      if (onRefreshSensors) {
        onRefreshSensors();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "提交失败", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, sensorStatus?: string) => {
    // 如果传感器不是"正常"，即使任务状态是"已完成"，也显示"进行中"
    if (status === '已完成' && sensorStatus !== '正常') {
      return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="h-3 w-3 mr-1" />进行中</Badge>;
    }
    switch (status) {
      case '已发布':
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />待处理</Badge>;
      case '进行中':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="h-3 w-3 mr-1" />进行中</Badge>;
      case '已完成':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />已完成</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (currentUser?.role !== '工人') {
    return null;
  }

  return (
    <div className="space-y-6">
      {!fromBanner && !inDialog && (
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary tracking-tight">维修指令</h2>
          <p className="text-xs text-muted-foreground">当前共有 {commands.length} 条待处理指令</p>
        </div>
      )}

      {/* 横幅模式下显示当前选中的指令详情 */}
      {(fromBanner || inDialog) && selectedCommand && (
        <Card className="border-primary shadow-lg bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {getStatusBadge(getCommandStatus(selectedCommand), selectedCommand.sensor_status)}
                </div>
                <CardTitle className="text-lg">{selectedCommand.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-xs">
                  <span>编号: {selectedCommand.command_number}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedCommand.created_at), 'yyyy-MM-dd HH:mm')}
                  </span>
                  {selectedCommand.deadline && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3 w-3" />
                      截止: {format(new Date(selectedCommand.deadline), 'yyyy-MM-dd HH:mm')}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{selectedCommand.content}</p>
            {selectedCommand.feedback && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">已提交反馈:</p>
                <p className="text-sm">{selectedCommand.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!fromBanner && !inDialog && commands.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-headline text-lg font-semibold text-muted-foreground">暂无维修指令</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              当前没有收到任何维修指令，请等待管理员派工。
            </p>
          </CardContent>
        </Card>
      ) : (
        !fromBanner && !inDialog && (
          <div className="space-y-4">
            {commands.map((command) => (
              <Card
                key={command.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedCommand?.id === command.id ? 'border-primary ring-1 ring-primary/20' : '',
                  !command.read_status ? 'bg-blue-50/50' : ''
                )}
                onClick={() => {
                  setSelectedCommand(command);
                  setFeedback(command.feedback || '');
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(getCommandStatus(command), command.sensor_status)}
                        {!command.read_status && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{command.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-xs">
                        <span>编号: {command.command_number}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(command.created_at), 'yyyy-MM-dd HH:mm')}
                        </span>
                        {command.deadline && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            截止: {format(new Date(command.deadline), 'yyyy-MM-dd HH:mm')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{command.content}</p>
                  {command.feedback && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">已提交反馈:</p>
                      <p className="text-sm">{command.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* 反馈表单 - 仅在任务未完成时显示 */}
      {selectedCommand && !isCommandCompleted(selectedCommand) && (
        <Card className="border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">提交维修反馈</CardTitle>
            <CardDescription>指令: {selectedCommand.command_number} - {selectedCommand.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">维修情况描述</label>
              <textarea
                placeholder="请描述维修情况、发现的问题及解决方案..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* 图片上传 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                上传现场照片
                <span className="text-xs text-muted-foreground">(最多5张)</span>
              </label>
              <div className="border-2 border-dashed border-muted rounded-lg p-4">
                <input
                  type="file"
                  id="photos-upload"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <label
                  htmlFor="photos-upload"
                  className="cursor-pointer flex flex-col items-center justify-center text-center py-4"
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">点击上传图片</p>
                  <p className="text-xs text-muted-foreground">支持 jpg, png, gif</p>
                </label>

                {/* 图片预览 */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={preview} alt={`预览${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePhoto(index);
                          }}
                          aria-label="删除图片"
                          title="删除图片"
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <X aria-hidden="true" className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 更新传感器状态选项 */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <button
                type="button"
                onClick={() => setUpdateSensor(!updateSensor)}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  updateSensor ? 'bg-primary border-primary' : 'border-muted-foreground'
                )}
              >
                {updateSensor && <Check className="h-3 w-3 text-white" />}
              </button>
              <label className="text-sm font-medium cursor-pointer" onClick={() => setUpdateSensor(!updateSensor)}>
                维修完成，将传感器状态改为"正常"，同时将我改为"空闲"状态
              </label>
            </div>

            <Button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting || !feedback.trim()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Send className="mr-2 h-4 w-4" />
              提交反馈
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedCommand && isCommandCompleted(selectedCommand) && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-medium text-green-800">任务已完成</h3>
            <p className="text-sm text-green-700 mt-1">该维修任务已处理完成</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
