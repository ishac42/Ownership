import React, { useState, useEffect } from 'react';
import { List, BarChart3, X, Building2 } from 'lucide-react';
import OwnershipList from './OwnershipList';
import OwnershipChart from './OwnershipChart';

interface TabWorkspaceProps {
  selectedRecord: any;
  onRefresh: () => void;
  bulkCache: Record<string, any[]>;
}

const TabWorkspace: React.FC<TabWorkspaceProps> = ({ selectedRecord, onRefresh, bulkCache }) => {
  const [tabs, setTabs] = useState<any[]>([
    { id: 'main', title: 'Entity Details', type: 'main', entity: null, viewMode: 'list' }
  ]);
  const [activeTabId, setActiveTabId] = useState('main');

  const mainRecordId = selectedRecord?.referenceNbr || selectedRecord?.referenceNumber || selectedRecord?.id;

  useEffect(() => {
    if (selectedRecord) {
      setTabs(prevTabs => {
        const currentMain = prevTabs.find(t => t.id === 'main');
        const currentMainId = currentMain?.entity?.referenceNbr || currentMain?.entity?.referenceNumber || currentMain?.entity?.id;

        if (mainRecordId !== currentMainId) {
          setActiveTabId('main');
          return [{ id: 'main', title: 'Entity Details', type: 'main', entity: selectedRecord, viewMode: 'list' }];
        }

        return prevTabs.map(t => t.id === 'main' ? { ...t, entity: selectedRecord } : t);
      });
    }
  }, [selectedRecord, mainRecordId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const currentViewMode = activeTab.viewMode || 'list';

  const setTabViewMode = (mode: 'list' | 'chart') => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, viewMode: mode } : t));
  };

  const handleViewRelated = (entity: any) => {
    const tabId = String(entity.referenceNbr || entity.referenceNumber || entity.id || `unknown-${Date.now()}`);
    const tabExists = tabs.some(t => t.id === tabId);

    if (!tabExists && tabs.length >= 13) {
      alert('Maximum limit of 13 tabs reached. Please close a tab to open a new one.');
      return;
    }

    if (!tabExists) {
      setTabs(prev => [
        ...prev,
        {
          id: tabId,
          title: entity.ownerName || entity.firstName || 'Related Entity',
          type: 'related',
          entity,
          viewMode: 'list',
        },
      ]);
    }
    setActiveTabId(tabId);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) setActiveTabId('main');
  };

  return (
    <div className="w-full bg-[#f8f9fa] shadow-md rounded-t-lg rounded-b-xl border border-slate-200 flex flex-col">
      {/* Tab Header Strip */}
      <div className="flex items-end px-2 pt-2 bg-[#e8eaed] gap-1 overflow-x-auto rounded-t-lg border-b border-slate-200 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{ marginBottom: activeTabId === tab.id ? '-1px' : '0' }}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-t-md border-t border-l border-r transition-colors min-w-[120px] max-w-[180px] shrink-0 ${activeTabId === tab.id ? 'bg-white border-slate-200 text-blue-700 z-10' : 'bg-[#dadce0] border-transparent text-slate-600 hover:bg-[#f1f3f4]'}`}
          >
            {tab.type === 'main'
              ? <Building2 size={12} className={activeTabId === tab.id ? 'text-blue-600' : 'text-slate-500'} />
              : <div className={`w-1.5 h-1.5 rounded-full ${activeTabId === tab.id ? 'bg-blue-500' : 'bg-slate-400'}`} />}
            <span className="truncate flex-1 text-left uppercase">{tab.title}</span>
            {tab.id !== 'main' && (
              <div
                onClick={(e) => handleCloseTab(e, tab.id)}
                className={`p-0.5 rounded transition-colors ${activeTabId === tab.id ? 'hover:bg-slate-100 text-slate-400 hover:text-red-500' : 'hover:bg-slate-300 text-slate-500'}`}
                title="Close Tab"
              >
                <X size={12} />
              </div>
            )}
          </button>
        ))}
        <div className="flex-1" />
      </div>

      {/* Tab Content Workspace Area */}
      <div className="bg-white px-5 py-3 rounded-b-xl min-h-[450px]">
        <div className="flex justify-end items-center mb-3">
          <div className="flex border border-slate-200 rounded shadow-sm bg-white overflow-hidden">
            <button 
              onClick={() => setTabViewMode('list')} 
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${currentViewMode === 'list' ? 'bg-[#24417a] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List size={14} /> List View
            </button>
            <button 
              onClick={() => setTabViewMode('chart')} 
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors border-l border-slate-200 ${currentViewMode === 'chart' ? 'bg-[#24417a] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BarChart3 size={14} /> Chart View
            </button>
          </div>
        </div>

        {/* Structural Symetry Rendering Wrapper */}
        <div className="animate-in fade-in duration-300 bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner">
          {currentViewMode === 'list' ? (
            <OwnershipList 
              entity={activeTabId === 'main' ? selectedRecord : activeTab?.entity} 
              onRefresh={onRefresh} 
              onViewRelated={handleViewRelated}
              isReverseRelation={activeTabId !== 'main'}
              reverseData={activeTabId !== 'main' ? (bulkCache[activeTabId] ?? null) : null}
            />
          ) : (
            <div className="overflow-x-auto pb-10 flex justify-center">
              <OwnershipChart 
                entity={activeTabId === 'main' ? selectedRecord : activeTab?.entity} 
                onRefresh={onRefresh} 
                onViewRelated={handleViewRelated}
                isReverseRelation={activeTabId !== 'main'}
                reverseData={activeTabId !== 'main' ? (bulkCache[activeTabId] ?? null) : null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabWorkspace;