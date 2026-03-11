"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API, type User } from '@/lib/api';
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
}

export default function CommandsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      setCurrentUser(user);
      loadCommands();
    } catch {
      router.push('/');
    }
  };

  const loadCommands = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      let commandData;
      if (currentUser?.role === '工人') {
        commandData = await API.getReceivedCommands();
      } else {
        const { data } = await API.getCommands(params);
        commandData = data;
      }

      setCommands(commandData);
    } catch (error: any) {
      toast({ variant: "destructive", title: "加载失败", description: error.message || "无法加载命令" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommand = () => {
    router.push('/commands/create');
  };

  const handleViewCommand = (id: number) => {
    router.push(`/commands/${id}`);
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">命令管理</h1>
            <p className="text-muted-foreground">
              {currentUser?.role === '管理员' ? '管理和发布命令' : '查看和执行命令'}
            </p>
          </div>
          {currentUser?.role === '管理员' && (
            <Button onClick={handleCreateCommand} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              创建命令
            </Button>
          )}
        </div>

        {/* 过滤器 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索命令..."
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
              <SelectItem value="未执行">未执行</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 命令列表 */}
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
          ) : commands.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  {currentUser?.role === '管理员' ? '暂无命令' : '暂无待执行的命令'}
                </div>
              </CardContent>
            </Card>
          ) : (
            commands
              .filter((command) =>
                command.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                command.content.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((command) => (
                <Card key={command.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewCommand(command.id)}>
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{command.title}</h3>
                        {command.recipient_status && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(command.recipient_status)}`}>
                            {getStatusIcon(command.recipient_status)}
                            <span className="ml-1">{command.recipient_status}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <div className="flex items-center gap-1">
                          <span>{command.admin_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(command.created_at), 'yyyy-MM-dd HH:mm')}</span>
                        </div>
                        {command.deadline && (
                          <div className="flex items-center gap-1 text-red-500">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(command.deadline), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {command.content}
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