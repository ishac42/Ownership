import React, { useState, useEffect } from 'react';
import { List, BarChart3, X, Building2 } from 'lucide-react';
import OwnershipList from './OwnershipList';
import OwnershipChart from './OwnershipChart';

interface TabWorkspaceProps {
  selectedRecord: any;
  onRefresh: () => Promise<void> | void;
  onOwnerUpdated?: (refNbr: string, updates: Record<string, unknown>) => void;
  bulkCache: Record<string, any[]>;
}

const TabWorkspace: React.FC<TabWorkspaceProps> = ({ selectedRecord, onRefresh, onOwnerUpdated, bulkCache }) => {
  const [tabs, setTabs] = useState<any[]>([
    { id: 'main', title: 'Entity Details', type: 'main', entity: null, viewMode: 'list' }
  ]);
  const [activeTabId, setActiveTabId] = useState('main');
  
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const mainRecordId = selectedRecord?.referenceNbr || selectedRecord?.referenceNumber || selectedRecord?.id;

  useEffect(() => {
    if (selectedRecord) {
      setTabs(prevTabs => {
        const currentMain = prevTabs.find(t => t.id === 'main');
        const currentMainId = currentMain?.entity?.referenceNbr || currentMain?.entity?.referenceNumber || currentMain?.entity?.id;

        if (mainRecordId !== currentMainId) {
          setActiveTabId('main');
          setExpandedNodes({}); 
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
      <div role="tablist" aria-label="Entity tabs" className="flex items-end px-2 pt-2 bg-[#e8eaed] gap-1 overflow-x-auto rounded-t-lg border-b border-slate-200 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              style={{ marginBottom: isActive ? '-1px' : '0' }}
              className={`group flex items-center shrink-0 rounded-t-md border-t border-l border-r min-w-[120px] max-w-[180px] ${
                isActive ? 'bg-white border-slate-200 z-10' : 'bg-[#dadce0] border-transparent'
              }`}
            >
              <button
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 flex-1 min-w-0 px-3 py-1.5 text-[11px] font-semibold rounded-t-md transition-colors ${
                  isActive ? 'text-blue-700' : 'text-slate-600 hover:bg-[#f1f3f4]'
                }`}
              >
                {tab.type === 'main'
                  ? <Building2 size={12} className={isActive ? 'text-blue-600' : 'text-slate-500'} aria-hidden="true" />
                  : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`} aria-hidden="true" />}
                <span className="truncate flex-1 text-left uppercase">{tab.title}</span>
              </button>
              {tab.id !== 'main' && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className={`shrink-0 p-1 mr-1 rounded transition-colors ${
                    isActive ? 'hover:bg-slate-100 text-slate-500 hover:text-red-500' : 'hover:bg-slate-300 text-slate-500'
                  }`}
                  aria-label={`Close ${tab.title} tab`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
        <div className="flex-1" />
      </div>

      {/* Tab Content Workspace Area */}
      <div className="bg-white px-5 py-3 rounded-b-xl min-h-[450px]">
        <h2 className="sr-only">{activeTab.title} workspace</h2>
        
        {/* Only show the toggle buttons if it is the main tab */}
        {activeTabId === 'main' && (
          <div className="flex justify-end items-center mb-3" role="group" aria-label="View mode">
            <div className="flex border border-slate-200 rounded shadow-sm bg-white overflow-hidden">
              <button 
                onClick={() => setTabViewMode('list')} 
                aria-pressed={currentViewMode === 'list'}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${currentViewMode === 'list' ? 'bg-[#24417a] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <List size={14} aria-hidden="true" /> List View
              </button>
              <button 
                onClick={() => setTabViewMode('chart')} 
                aria-pressed={currentViewMode === 'chart'}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors border-l border-slate-200 ${currentViewMode === 'chart' ? 'bg-[#24417a] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <BarChart3 size={14} aria-hidden="true" /> Chart View
              </button>
            </div>
          </div>
        )}

        {/* Render Workspace Body */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const viewMode = tab.viewMode || 'list';

            return (
              <div 
                key={tab.id}
                role="tabpanel"
                id={`tabpanel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
                hidden={!isActive}
                className={`${isActive ? 'block' : 'hidden'}`}
              >
                {tab.id === 'main' ? (
                  /* --- MAIN TAB --- */
                  /* Keep BOTH List and Chart in the DOM, toggle visibility via CSS to prevent refresh jumps */
                  <>
                    <div className={`${viewMode === 'list' ? 'block animate-in fade-in duration-200' : 'hidden'}`}>
                      <OwnershipList 
                        entity={selectedRecord} 
                        onRefresh={onRefresh}
                        onOwnerUpdated={onOwnerUpdated}
                        onViewRelated={handleViewRelated}
                        isReverseRelation={false}
                        reverseData={null}
                        expandedNodes={expandedNodes}
                        setExpandedNodes={setExpandedNodes}
                      />
                    </div>

                    <div className={`${viewMode === 'chart' ? 'block animate-in fade-in duration-200' : 'hidden'}`}>
                      <div className="overflow-x-auto pb-10 flex justify-center">
                        <OwnershipChart 
                          entity={selectedRecord} 
                          onRefresh={onRefresh}
                          onOwnerUpdated={onOwnerUpdated}
                          onViewRelated={handleViewRelated}
                          isReverseRelation={false}
                          reverseData={null}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* --- RELATED (REVERSE) TABS --- */
                  <div className="block animate-in fade-in duration-200">
                    <div className="overflow-x-auto pb-10 flex justify-center">
                      <OwnershipChart 
                        entity={tab.entity} 
                        onRefresh={onRefresh}
                        onOwnerUpdated={onOwnerUpdated}
                        onViewRelated={handleViewRelated}
                        isReverseRelation={true}
                        reverseData={bulkCache[tab.id] ?? null}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabWorkspace;