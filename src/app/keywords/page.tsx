'use client';
import { useEffect, useState, useCallback } from 'react';
import { KeywordGroup } from '@/types';
import { KeywordGroupCard } from '@/components/keywords/KeywordGroupCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function KeywordsPage() {
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPriority, setNewGroupPriority] = useState('normal');
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/keyword-groups');
    const data = await res.json();
    setGroups(data);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    await fetch('/api/keyword-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim(), priority: newGroupPriority }),
    });
    setNewGroupName('');
    fetchGroups();
    toast({ title: '그룹 추가 완료' });
  };

  const addKeyword = async (groupId: number, keyword: string) => {
    await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, keyword }),
    });
    fetchGroups();
    toast({ title: `"${keyword}" 추가됨` });
  };

  const deleteKeyword = async (id: number) => {
    await fetch('/api/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchGroups();
  };

  const toggleKeyword = async (id: number, isActive: number) => {
    await fetch('/api/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: isActive }),
    });
    fetchGroups();
  };

  const deleteGroup = async (id: number) => {
    await fetch('/api/keyword-groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchGroups();
  };

  const toggleGroup = async (id: number, isActive: number) => {
    await fetch('/api/keyword-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: isActive }),
    });
    fetchGroups();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">키워드 관리</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <p className="text-xs font-semibold text-slate-500 mb-3">새 키워드 그룹 추가</p>
        <div className="flex gap-2">
          <Input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGroup()}
            placeholder="그룹명 입력..."
            className="flex-1 h-8 text-sm"
          />
          <Select value={newGroupPriority} onValueChange={setNewGroupPriority}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="core">🔴 핵심</SelectItem>
              <SelectItem value="interest">⭐ 관심</SelectItem>
              <SelectItem value="normal">일반</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addGroup} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">그룹 추가</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(group => (
          <KeywordGroupCard
            key={group.id}
            group={group}
            onAddKeyword={addKeyword}
            onDeleteKeyword={deleteKeyword}
            onToggleKeyword={toggleKeyword}
            onDeleteGroup={deleteGroup}
            onToggleGroup={toggleGroup}
          />
        ))}
      </div>
    </div>
  );
}
