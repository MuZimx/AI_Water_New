"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API } from '@/lib/api';
import { Clock, CheckCircle, AlertCircle, User, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackData {
  id: number;
  command_number: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  feedback: string | null;
  photos: string[];
  response_time: string | null;
  worker_name: string;
  worker_full_name: string | null;
}

interface SensorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sensorId: number | null;
}

export function SensorDetailsDialog({ open, onOpenChange, sensorId }: SensorDetailsDialogProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sensorId) {
      loadFeedbacks();
    }
  }, [open, sensorId]);

  const loadFeedbacks = async () => {
    if (!sensorId) return;

    setLoading(true);
    try {
      // 获取所有与该传感器相关的指令
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api','') || 'http://localhost:3000'}/api/commands?sensor_id=${sensorId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();

      if (data.success && data.data) {
        // 对每个指令获取详情
        const allFeedbacks = await Promise.all(
          data.data.map(async (cmd: any) => {
            const details = await API.getCommandDetails(cmd.id);
            return details.map((d: any) => ({
              ...d,
              photos: d.photos || []
            }));
          })
        );
        setFeedbacks(allFeedbacks.flat());
      }
    } catch (error) {
      console.error('加载反馈失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">传感器维修详情</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无维修反馈记录
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                    {/* 标题和状态 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{feedback.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          编号: {feedback.command_number}
                        </p>
                      </div>
                      {getStatusBadge(feedback.status)}
                    </div>

                    {/* 工人信息 */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>维修人员: {feedback.worker_full_name || feedback.worker_name}</span>
                    </div>

                    {/* 任务内容 */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">{feedback.content}</p>
                    </div>

                    {/* 反馈内容 */}
                    {feedback.feedback && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">维修反馈:</p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-900">{feedback.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* 图片 */}
                    {feedback.photos && feedback.photos.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          现场照片:
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {feedback.photos.map((photo, idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-lg overflow-hidden cursor-pointer border hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => setSelectedImage(photo)}
                            >
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api','') || 'http://localhost:3000'}${photo}`}
                                alt={`照片${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 响应时间 */}
                    {feedback.response_time && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>反馈时间: {format(new Date(feedback.response_time), 'yyyy-MM-dd HH:mm:ss')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览大图 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10002] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api','') || 'http://localhost:3000'}${selectedImage}`}
              alt="预览"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
              title="关闭预览"
              aria-label="关闭预览"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
