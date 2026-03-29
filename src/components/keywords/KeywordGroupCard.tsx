'use client';
import { KeywordGroup } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Props {
  group: KeywordGroup;
  onAddKeyword: (groupId: number, keyword: string | string[]) => void;
  onDeleteKeyword: (id: number) => void;
  onToggleKeyword: (id: number, isActive: number) => void;
  onDeleteGroup: (id: number) => void;
  onToggleGroup: (id: number, isActive: number) => void;
}

export function KeywordGroupCard({
  group, onAddKeyword, onDeleteKeyword, onToggleKeyword, onDeleteGroup, onToggleGroup
}: Props) {
  const [newKw, setNewKw] = useState('');

  const handleAdd = () => {
    if (!newKw.trim()) return;
    const keywords = newKw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywords.length === 0) return;
    onAddKeyword(group.id, keywords.length === 1 ? keywords[0] : keywords);
    setNewKw('');
  };

  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-xl border p-4 transition-opacity',
      group.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{group.name}</span>
          <Badge className={cn('text-xs', PRIORITY_COLORS[group.priority])}>
            {PRIORITY_LABELS[group.priority]}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs"
            onClick={() => onToggleGroup(group.id, group.is_active ? 0 : 1)}
          >
            {group.is_active ? '비활성화' : '활성화'}
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => { if (confirm(`"${group.name}" 그룹을 삭제할까요?`)) onDeleteGroup(group.id); }}
          >
            삭제
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
        {(group.keywords || []).map(kw => (
          <span
            key={kw.id}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
              kw.is_active
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-600 line-through'
            )}
          >
            {kw.keyword}
            <button
              onClick={() => onToggleKeyword(kw.id, kw.is_active ? 0 : 1)}
              className="opacity-50 hover:opacity-100 font-bold"
              title={kw.is_active ? '비활성화' : '활성화'}
            >
              {kw.is_active ? '○' : '●'}
            </button>
            <button
              onClick={() => { if (confirm(`"${kw.keyword}" 키워드를 삭제할까요?`)) onDeleteKeyword(kw.id); }}
              className="opacity-50 hover:opacity-100 text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newKw}
          onChange={e => setNewKw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="키워드 입력 (쉼표로 여러 개: A,B,C)"
          className="h-7 text-xs flex-1"
        />
        <Button size="sm" onClick={handleAdd} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white">추가</Button>
      </div>
    </div>
  );
}
