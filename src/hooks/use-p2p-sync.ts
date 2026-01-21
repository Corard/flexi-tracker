import { useState, useCallback, useRef, useEffect } from "react";
import type { DataConnection } from "peerjs";
import { PeerConnectionManager } from "@/lib/sync/peer-connection";
import {
  createSyncRequest,
  createSyncResponse,
  createSyncComplete,
  isSyncMessage,
  validateSyncPayload,
} from "@/lib/sync/sync-protocol";
import { prepareSyncResult } from "@/lib/sync/merge-strategy";
import type { AppState, SyncPayload, SyncResult } from "@/types/flexi-tracker";

export type SyncStatus =
  | "idle"
  | "hosting"
  | "scanning"
  | "connecting"
  | "awaiting-acceptance"
  | "syncing"
  | "conflicts"
  | "complete"
  | "error";

export interface P2PSyncState {
  status: SyncStatus;
  peerId: string | null;
  error: string | null;
  syncResult: SyncResult | null;
  pendingConnection: DataConnection | null;
}

export function useP2PSync(appState: AppState, onMerge: (state: AppState) => void) {
  const [state, setState] = useState<P2PSyncState>({
    status: "idle",
    peerId: null,
    error: null,
    syncResult: null,
    pendingConnection: null,
  });

  const peerManager = useRef<PeerConnectionManager | null>(null);
  const activeConnection = useRef<DataConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remotePayload = useRef<SyncPayload | null>(null);
  const connectionAccepted = useRef(false);
  const pendingData = useRef<{ data: unknown; conn: DataConnection } | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    peerManager.current?.destroy();
    peerManager.current = null;
    activeConnection.current = null;
    remotePayload.current = null;
    connectionAccepted.current = false;
    pendingData.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const createLocalPayload = useCallback((): SyncPayload => {
    return {
      entries: appState.entries,
      adjustments: appState.adjustments,
      settings: appState.settings,
      timestamp: Date.now(),
    };
  }, [appState]);

  const processIncomingData = useCallback(
    (data: unknown, conn: DataConnection) => {
      if (!isSyncMessage(data)) return;

      if (data.type === "SYNC_REQUEST" && validateSyncPayload(data.payload)) {
        // Store remote payload and send our data back
        remotePayload.current = data.payload;
        const localPayload = createLocalPayload();
        peerManager.current?.sendData(conn, createSyncResponse(localPayload));

        // Process merge
        const result = prepareSyncResult(localPayload, data.payload);
        if (result.conflicts.length > 0) {
          setState((s) => ({ ...s, status: "conflicts", syncResult: result }));
        } else {
          // No conflicts, apply merge directly
          onMerge({
            ...appState,
            entries: result.mergedEntries,
            adjustments: result.mergedAdjustments,
          });
          peerManager.current?.sendData(conn, createSyncComplete());
          setState((s) => ({ ...s, status: "complete", syncResult: result }));
        }
      } else if (data.type === "SYNC_COMPLETE") {
        setState((s) => ({ ...s, status: "complete" }));
      }
    },
    [createLocalPayload, appState, onMerge]
  );

  const startHosting = useCallback(async () => {
    cleanup();
    setState((s) => ({ ...s, status: "hosting", error: null, peerId: null }));

    try {
      peerManager.current = new PeerConnectionManager();

      peerManager.current.on("onError", (error) => {
        setState((s) => ({ ...s, status: "error", error: error.message }));
      });

      peerManager.current.on("onConnection", (conn) => {
        // Store pending connection, wait for user acceptance
        setState((s) => ({
          ...s,
          status: "awaiting-acceptance",
          pendingConnection: conn,
        }));

        // Clear timeout since we got a connection
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });

      peerManager.current.on("onData", (data, conn) => {
        if (!isSyncMessage(data)) return;

        // Buffer data if connection not yet accepted
        if (!connectionAccepted.current) {
          pendingData.current = { data, conn };
          return;
        }

        processIncomingData(data, conn);
      });

      const peerId = await peerManager.current.createPeer();
      setState((s) => ({ ...s, peerId }));

      // 2-minute timeout
      timeoutRef.current = setTimeout(() => {
        setState((s) => ({
          ...s,
          status: "error",
          error: "Connection timed out. QR code expired.",
        }));
        cleanup();
      }, 120000);
    } catch (error) {
      setState((s) => ({
        ...s,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to create peer",
      }));
    }
  }, [cleanup, createLocalPayload, appState, onMerge]);

  const acceptConnection = useCallback(() => {
    const conn = state.pendingConnection;
    if (!conn) return;

    connectionAccepted.current = true;
    activeConnection.current = conn;
    setState((s) => ({ ...s, status: "syncing", pendingConnection: null }));

    // Process any buffered data
    if (pendingData.current) {
      processIncomingData(pendingData.current.data, pendingData.current.conn);
      pendingData.current = null;
    }
  }, [state.pendingConnection, processIncomingData]);

  const rejectConnection = useCallback(() => {
    const conn = state.pendingConnection;
    if (conn) {
      peerManager.current?.closeConnection(conn);
    }
    setState((s) => ({
      ...s,
      status: "hosting",
      pendingConnection: null,
    }));

    // Restart timeout
    timeoutRef.current = setTimeout(() => {
      setState((s) => ({
        ...s,
        status: "error",
        error: "Connection timed out. QR code expired.",
      }));
      cleanup();
    }, 120000);
  }, [state.pendingConnection, cleanup]);

  const connectToPeer = useCallback(
    async (remotePeerId: string) => {
      cleanup();
      setState((s) => ({ ...s, status: "connecting", error: null }));

      try {
        peerManager.current = new PeerConnectionManager();

        peerManager.current.on("onError", (error) => {
          setState((s) => ({ ...s, status: "error", error: error.message }));
        });

        peerManager.current.on("onData", (data, conn) => {
          if (!isSyncMessage(data)) return;

          if (data.type === "SYNC_RESPONSE" && validateSyncPayload(data.payload)) {
            // Process merge
            const localPayload = createLocalPayload();
            remotePayload.current = data.payload;
            const result = prepareSyncResult(localPayload, data.payload);

            if (result.conflicts.length > 0) {
              setState((s) => ({ ...s, status: "conflicts", syncResult: result }));
            } else {
              // No conflicts, apply merge directly
              onMerge({
                ...appState,
                entries: result.mergedEntries,
                adjustments: result.mergedAdjustments,
              });
              peerManager.current?.sendData(conn, createSyncComplete());
              setState((s) => ({ ...s, status: "complete", syncResult: result }));
            }
          } else if (data.type === "SYNC_COMPLETE") {
            setState((s) => ({ ...s, status: "complete" }));
          }
        });

        const conn = await peerManager.current.connectToPeer(remotePeerId);
        activeConnection.current = conn;
        setState((s) => ({ ...s, status: "syncing" }));

        // Send sync request
        const localPayload = createLocalPayload();
        peerManager.current.sendData(conn, createSyncRequest(localPayload));
      } catch (error) {
        setState((s) => ({
          ...s,
          status: "error",
          error: error instanceof Error ? error.message : "Failed to connect",
        }));
      }
    },
    [cleanup, createLocalPayload, appState, onMerge]
  );

  const resolveConflicts = useCallback(
    (resolutions: Map<string, "local" | "remote">) => {
      if (!state.syncResult) return;

      // Apply resolutions to merged entries
      const finalEntries = { ...state.syncResult.mergedEntries };
      for (const conflict of state.syncResult.conflicts) {
        const choice = resolutions.get(conflict.date);
        if (choice === "local") {
          finalEntries[conflict.date] = conflict.local;
        } else if (choice === "remote") {
          finalEntries[conflict.date] = conflict.remote;
        }
      }

      onMerge({
        ...appState,
        entries: finalEntries,
        adjustments: state.syncResult.mergedAdjustments,
      });

      // Send complete signal
      if (activeConnection.current && peerManager.current) {
        peerManager.current.sendData(activeConnection.current, createSyncComplete());
      }

      setState((s) => ({
        ...s,
        status: "complete",
        syncResult: {
          ...s.syncResult!,
          mergedEntries: finalEntries,
          conflicts: [],
        },
      }));
    },
    [state.syncResult, appState, onMerge]
  );

  const reset = useCallback(() => {
    cleanup();
    setState({
      status: "idle",
      peerId: null,
      error: null,
      syncResult: null,
      pendingConnection: null,
    });
  }, [cleanup]);

  const startScanning = useCallback(() => {
    setState((s) => ({ ...s, status: "scanning", error: null }));
  }, []);

  return {
    ...state,
    startHosting,
    startScanning,
    connectToPeer,
    acceptConnection,
    rejectConnection,
    resolveConflicts,
    reset,
  };
}
