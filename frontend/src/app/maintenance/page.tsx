"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API, type User as TUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MaintenanceRecord {
  id: number;
  user_id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<TUser | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadUser();
  }, []);

  // 当搜索查询或状态过滤器变化时，重新加载检修记录
  useEffect(() => {
    if (currentUser) {
      loadRecords();
    }
  }, [searchQuery, statusFilter]);

  const loadUser = async () => {
    try {
      const user = await API.getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);
      loadRecords();
    } catch {
      router.push('/');
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const { data } = await API.getMaintenanceRecords(params);
      setRecords(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "加载失败", description: error.message || "无法加载检修记录" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = () => {
    router.push('/maintenance/create');
  };

  const handleViewRecord = (id: number) => {
    router.push(`/maintenance/detail?id=${id}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '未读':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case '已读':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '未读':
        return 'bg-yellow-100 text-yellow-800';
      case '已读':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">检修记录管理</h1>
            <p className="text-muted-foreground">管理和跟踪所有检修活动</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              返回主页
            </Button>
            <Button onClick={handleCreateRecord} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              创建检修记录
            </Button>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索检修记录..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="未读">未读</SelectItem>
              <SelectItem value="已读">已读</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 检修记录列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">暂无检修记录</div>
              </CardContent>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewRecord(record.id)}>
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{record.title}</h3>
                        <span className={`flex items-center px-2 py-0.5 text-xs rounded-full ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          <span className="ml-1">{record.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{record.username}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {record.content}
                    </p>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>
    </div>
  );
}