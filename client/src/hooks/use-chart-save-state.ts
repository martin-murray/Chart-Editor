import { useState, useCallback, useRef } from "react";

interface ChartSaveState {
  hasUnsavedChanges: boolean;
  lastSavedSnapshot: string | null;
  currentSavedEntryId: number | null;
}

interface ChartSaveStateOptions {
  hasSaveableContent?: (state: object) => boolean;
}

export function useChartSaveState(options?: ChartSaveStateOptions) {
  const [state, setState] = useState<ChartSaveState>({
    hasUnsavedChanges: false,
    lastSavedSnapshot: null,
    currentSavedEntryId: null,
  });
  
  const initialSnapshotRef = useRef<string | null>(null);

  const updateCurrentState = useCallback((currentState: object, hasSaveableContent: boolean = true): void => {
    const currentSnapshot = JSON.stringify(currentState);
    
    // Track the initial state for comparison
    if (initialSnapshotRef.current === null) {
      initialSnapshotRef.current = currentSnapshot;
    }
    
    setState((prev) => {
      // If we've saved before, compare against saved state
      if (prev.lastSavedSnapshot !== null) {
        return {
          ...prev,
          hasUnsavedChanges: prev.lastSavedSnapshot !== currentSnapshot,
        };
      }
      
      // If never saved, mark as unsaved if there's saveable content and state differs from initial
      const hasChangesFromInitial = initialSnapshotRef.current !== currentSnapshot;
      return {
        ...prev,
        hasUnsavedChanges: hasSaveableContent && hasChangesFromInitial,
      };
    });
  }, []);

  const markAsSaved = useCallback((entryId: number, snapshot: object): void => {
    const snapshotStr = JSON.stringify(snapshot);
    initialSnapshotRef.current = snapshotStr; // Reset initial to saved state
    setState({
      hasUnsavedChanges: false,
      lastSavedSnapshot: snapshotStr,
      currentSavedEntryId: entryId,
    });
  }, []);

  const resetSaveState = useCallback((): void => {
    initialSnapshotRef.current = null;
    setState({
      hasUnsavedChanges: false,
      lastSavedSnapshot: null,
      currentSavedEntryId: null,
    });
  }, []);

  const checkForChanges = useCallback((currentState: object): boolean => {
    const currentSnapshot = JSON.stringify(currentState);
    if (state.lastSavedSnapshot !== null) {
      return state.lastSavedSnapshot !== currentSnapshot;
    }
    // For unsaved charts, compare against initial
    return initialSnapshotRef.current !== currentSnapshot;
  }, [state.lastSavedSnapshot]);

  return {
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastSavedSnapshot: state.lastSavedSnapshot,
    currentSavedEntryId: state.currentSavedEntryId,
    updateCurrentState,
    markAsSaved,
    resetSaveState,
    checkForChanges,
  };
}
