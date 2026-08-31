import React, { useState, useEffect, useRef } from 'react';
import { List, BarChart3, X, Building2, Loader2 } from 'lucide-react';
import OwnershipList from './OwnershipList';
import OwnershipChart from './OwnershipChart';
import { getEntityRef, ownershipTabId } from '../utils/entityType';
import { patchOwnerInTree } from '../utils/ownershipTree';

interface TabWorkspaceProps {
  selectedRecord: any;
  onRefresh: () => Promise<void> | void;
  onOwnerUpdated?: (refNbr: string, updates: Record<string, unknown>) => void;
  loadEntityByRef: (referenceNo: string) => Promise<any | null>;
  bulkCache: Record<string, any[]>;
}

const TabWorkspace: React.FC<TabWorkspaceProps> = ({
  selectedRecord,
  onRefresh,
  onOwnerUpdated,
  loadEntityByRef,
  bulkCache,
}) => {
  const [tabs, setTabs] = useState<any[]>([
    { id: 'main', title: 'Entity Details', type: 'main', entity: null, viewMode: 'list' }
  ]);
  const [activeTabId, setActiveTabId] = useState('main');
  
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const ownershipFetchInFlight = useRef(new Set<string>());

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

  const handleViewOperatingEntity = async (entity: any) => {
    const ref = getEntityRef(entity);
    if (!ref) {
      alert('This operating entity has no reference number.');
      return;
    }

    const tabId = ownershipTabId(ref);
    const existing = tabs.find((t) => t.id === tabId);
    let blockedByLimit = false;

    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      if (prev.length >= 13) {
        blockedByLimit = true;
        return prev;
      }
      return [
        ...prev,
        {
          id: tabId,
          title: entity.ownerName || entity.firstName || 'Operating Entity',
          type: 'ownership',
          entity: null,
          viewMode: 'chart',
          loading: true,
          error: null,
          referenceNbr: ref,
        },
      ];
    });

    if (blockedByLimit) {
      alert('Maximum limit of 13 tabs reached. Please close a tab to open a new one.');
      return;
    }

    setActiveTabId(tabId);

    if (existing?.entity && !existing.loading && !existing.error) {
      return;
    }
    if (ownershipFetchInFlight.current.has(ref)) {
      return;
    }

    ownershipFetchInFlight.current.add(ref);
    try {
      const record = await loadEntityByRef(ref);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                entity: record,
                loading: false,
                error: record ? null : 'No ownership structure found for this entity.',
                title: record?.ownerName || t.title,
              }
            : t
        )
      );
    } catch (error) {
      console.error('Failed to load operating entity ownership structure:', error);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                loading: false,
                error: 'Could not load ownership structure for this operating entity.',
              }
            : t
        )
      );
    } finally {
      ownershipFetchInFlight.current.delete(ref);
    }
  };

  const refreshOwnershipTab = async (tabId: string, ref: string) => {
    try {
      const record = await loadEntityByRef(ref);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                entity: record,
                error: record ? null : 'No ownership structure found for this entity.',
              }
            : t
        )
      );
    } catch (error) {
      console.error('Failed to refresh operating entity ownership structure:', error);
    }
  };

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) setActiveTabId('main');
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    if (tabId !== 'main' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      handleCloseTab(tabId);
    }
  };

  const activeClosableTab = activeTabId !== 'main' ? activeTab : null;

  return (
    <div className="w-full bg-[#f8f9fa] shadow-md rounded-t-lg rounded-b-xl border border-slate-200 flex flex-col">
      {/* Tab Header Strip — tablist may only contain role="tab" children */}
      <div className="flex items-end px-2 pt-2 bg-[#e8eaed] gap-1 rounded-t-lg border-b border-slate-200">
        <div
          role="tablist"
          aria-label="Entity tabs"
          className="flex items-end gap-1 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                style={{ marginBottom: isActive ? '-1px' : '0' }}
                className={`flex items-center gap-1.5 shrink-0 rounded-t-md border-t border-l border-r min-w-[120px] max-w-[180px] px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-white border-slate-200 text-blue-700 z-10'
                    : 'bg-[#dadce0] border-transparent text-slate-600 hover:bg-[#f1f3f4]'
                }`}
              >
                {tab.type === 'main' || tab.type === 'ownership'
                  ? <Building2 size={12} className={isActive ? 'text-blue-600' : 'text-slate-500'} aria-hidden="true" />
                  : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`} aria-hidden="true" />}
                <span className="truncate flex-1 text-left uppercase">{tab.title}</span>
              </button>
            );
          })}
        </div>
        {activeClosableTab && (
          <button
            type="button"
            onClick={() => handleCloseTab(activeClosableTab.id)}
            className="shrink-0 mb-1.5 p-1.5 rounded transition-colors hover:bg-slate-200 text-slate-500 hover:text-red-500"
            aria-label={`Close ${activeClosableTab.title} tab`}
            title={`Close ${activeClosableTab.title} tab`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
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
                          onViewOperatingEntity={handleViewOperatingEntity}
                          isReverseRelation={false}
                          reverseData={null}
                        />
                      </div>
                    </div>
                  </>
                ) : tab.type === 'ownership' ? (
                  <div className="block animate-in fade-in duration-200">
                    {tab.loading ? (
                      <div className="flex justify-center items-center py-20" role="status">
                        <Loader2 className="animate-spin text-[#2c3e76]" size={32} aria-hidden="true" />
                        <span className="sr-only">Loading ownership structure</span>
                      </div>
                    ) : tab.error ? (
                      <div className="text-center py-20 text-slate-600 italic">{tab.error}</div>
                    ) : tab.entity ? (
                      <div className="overflow-x-auto pb-10 flex justify-center">
                        <OwnershipChart
                          entity={tab.entity}
                          onRefresh={() => refreshOwnershipTab(tab.id, tab.referenceNbr)}
                          onOwnerUpdated={(refNbr, updates) => {
                            onOwnerUpdated?.(refNbr, updates);
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.id === tab.id && t.entity
                                  ? { ...t, entity: patchOwnerInTree(t.entity, refNbr, updates) }
                                  : t
                              )
                            );
                          }}
                          onViewRelated={handleViewRelated}
                          onViewOperatingEntity={handleViewOperatingEntity}
                          isReverseRelation={false}
                          reverseData={null}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* --- RELATED (REVERSE) TABS --- */
                  <div className="block animate-in fade-in duration-200">
                    <div className="overflow-x-auto pb-10 flex justify-center">
                      <OwnershipChart 
                        entity={tab.entity} 
                        onRefresh={onRefresh}
                        onOwnerUpdated={onOwnerUpdated}
                        onViewRelated={handleViewRelated}
                        onViewOperatingEntity={handleViewOperatingEntity}
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