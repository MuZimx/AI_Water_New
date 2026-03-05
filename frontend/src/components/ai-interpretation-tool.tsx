"use client";

import React, { useState } from 'react';
import { Sparkles, Loader2, ListChecks, Info, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RiskLevel } from '@/lib/mock-api';

interface AiRiskInterpretationOutput {
  interpretation: string;
  implications: string;
  suggestedActions: string[];
}

interface AIInterpretationToolProps {
  riskLevel: RiskLevel;
  confidence: number;
}

// 本地模拟的 AI 洞察数据（不依赖外部 API）
function getMockInterpretation(riskLevel: RiskLevel, confidence: number): AiRiskInterpretationOutput {
  const interpretations: Record<RiskLevel, AiRiskInterpretationOutput> = {
    '高风险': {
      interpretation: '检测到明显的水力异常信号，音频频谱显示高频泄漏特征，管道可能存在破损或接头松动。',
      implications: '若不及时处理，可能导致严重的漏损事故，影响供水稳定性并造成水资源浪费。紧急程度：高。',
      suggestedActions: [
        '立即派遣巡检人员到现场确认',
        '隔离相关管段以控制损失',
        '记录事件详情并生成维修工单',
        '监控周边管网压力变化'
      ]
    },
    '中风险': {
      interpretation: '存在潜在的水流扰动，可能是初期泄漏或设备异常，建议加强监测。',
      implications: '目前状况可控但需关注，可能逐步发展为更严重的漏损问题。',
      suggestedActions: [
        '增加该区域的巡检频率',
        '对比历史监测数据分析趋势',
        '准备应急维修方案',
        '在72小时内再次检测确认'
      ]
    },
    '低风险': {
      interpretation: '水力信号正常，未发现异常泄漏特征，管网运行状态良好。',
      implications: '系统运行正常，无需采取紧急措施。建议保持常规监测维护。',
      suggestedActions: [
        '继续按计划进行常规巡检',
        '记录本次检测数据作为基线',
        '关注邻近管段的运行状态'
      ]
    },
    '未检测': {
      interpretation: '该文件尚未完成分析，等待后端 Python 模型处理结果。',
      implications: '暂无可用数据，请等待分析完成。',
      suggestedActions: ['请稍后刷新页面查看结果']
    }
  };

  return interpretations[riskLevel];
}

export function AIInterpretationTool({ riskLevel, confidence }: AIInterpretationToolProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRiskInterpretationOutput | null>(null);

  const handleInterpret = async () => {
    setLoading(true);
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    setResult(getMockInterpretation(riskLevel, confidence));
    setLoading(false);
  };

  if (riskLevel === '未检测') return null;

  return (
    <Card className="border-secondary/20 shadow-md bg-white/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-secondary/5 border-b border-secondary/10 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-headline flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4 text-secondary" />
            AI 洞察引擎
          </CardTitle>
          {!result && !loading && (
            <Button size="sm" onClick={handleInterpret} className="h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              分析潜在影响
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            <p className="text-xs text-muted-foreground">正在咨询水力风险模型...</p>
          </div>
        )}

        {result && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Info className="h-3 w-3" />
                解释
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-secondary/30 pl-3">
                "{result.interpretation}"
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Lightbulb className="h-3 w-3" />
                影响
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {result.implications}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <ListChecks className="h-3 w-3" />
                建议操作
              </div>
              <ul className="grid gap-2">
                {result.suggestedActions.map((action, i) => (
                  <li key={i} className="text-xs flex items-start gap-2 bg-white/60 p-2 rounded border border-secondary/10">
                    <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-secondary mt-1" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">点击为此次检测结果生成可操作的智能洞察。</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
