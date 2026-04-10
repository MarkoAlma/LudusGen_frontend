import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  defaultParams, 
  fetchGlbAsBlob, 
  applyStylePrefix, 
  saveHistoryToFirestore,
  loadHistoryPageFromFirestore
} from '../ai_components/trellis/utils';

export function useTrellisLogic(userId, getIdToken) {
  const [prompt, setPrompt] = useState("");
  const [genStatus, setGenStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [params, setParams] = useState(defaultParams);
  const [selectedStyle, setSelectedStyle] = useState("nostyle");
  const [enhancing, setEnhancing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  
  const abortRef = useRef(null);
  const prevUrlRef = useRef(null);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const handleGenerate = async () => {
    if (genStatus === "pending" || !prompt.trim()) return;
    setGenStatus("pending");
    setErrorMsg("");
    
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers = await authHeaders();
      const resolvedSeed = params.randomSeed
        ? Math.floor(Math.random() * 2147483647)
        : Math.max(0, Math.floor(Number(params.seed) || 0));

      const res = await fetch("http://localhost:3001/api/trellis", {
        method: "POST", 
        headers, 
        signal: controller.signal,
        body: JSON.stringify({
          prompt: applyStylePrefix(prompt.trim(), selectedStyle),
          ...params,
          seed: resolvedSeed,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Generálás sikertelen");

      const blobUrl = await fetchGlbAsBlob(data.glb_url, getIdToken);
      setModelUrl(blobUrl);
      setGenStatus("succeeded");

      // Save to history
      const itemData = {
        prompt: prompt.trim(),
        status: "succeeded",
        model_url: data.glb_url,
        params: { ...params, seed: resolvedSeed },
        style: selectedStyle,
        ts: Date.now()
      };
      
      const { docId } = await saveHistoryToFirestore(userId, itemData);
      const newItem = { id: docId, ...itemData, createdAt: { toDate: () => new Date() } };
      setHistory(prev => [newItem, ...prev]);
      setActiveItem(newItem);

    } catch (err) {
      if (err.name !== "AbortError") {
        setErrorMsg(err.message);
        setGenStatus("failed");
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleStop = () => abortRef.current?.abort();

  return {
    prompt, setPrompt,
    genStatus, setGenStatus,
    errorMsg, setErrorMsg,
    modelUrl, setModelUrl,
    params, setParams,
    selectedStyle, setSelectedStyle,
    enhancing, setEnhancing,
    history, setHistory,
    historyLoading,
    activeItem, setActiveItem,
    handleGenerate,
    handleStop
  };
}
