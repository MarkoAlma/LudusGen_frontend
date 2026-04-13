import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  defaultParams,
  fetchGlbAsBlob,
  applyStylePrefix,
  saveHistoryToFirestore,
  loadHistoryPageFromFirestore,
} from '../ai_components/trellis/utils';
import { TRELLIS_ENHANCE_PROMPT, TRELLIS_SIMPLIFY_PROMPT } from '../ai_components/trellis/Constants';
import { API_BASE } from '../api/client';

export function useTrellisLogic(userId, getIdToken) {
  const [prompt, setPrompt] = useState("");
  const [genStatus, setGenStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [params, setParams] = useState(defaultParams);
  const [selectedStyle, setSelectedStyle] = useState("nostyle");
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  
  const abortRef = useRef(null);
   const prevUrlRef = useRef(null);
 
   // Custom Preset Persistence
   const [customPreset, setCustomPreset] = useState(() => {
     try {
       const saved = localStorage.getItem('trellis_custom_preset');
       return saved ? JSON.parse(saved) : null;
     } catch (e) {
       return null;
     }
   });
 
   const handleSaveCustomPreset = useCallback((newParams) => {
     const preset = {
       slat_cfg_scale: newParams.slat_cfg_scale,
       ss_cfg_scale: newParams.ss_cfg_scale,
       slat_sampling_steps: newParams.slat_sampling_steps,
       ss_sampling_steps: newParams.ss_sampling_steps,
     };
     localStorage.setItem('trellis_custom_preset', JSON.stringify(preset));
     setCustomPreset(preset);
   }, []);

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

      const res = await fetch(`${API_BASE}/api/trellis`, {
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

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          provider: "groq",
          messages: [
            { role: "system", content: TRELLIS_ENHANCE_PROMPT },
            { role: "user", content: prompt.trim() }
          ],
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 10000
        }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "API hiba");
      const raw = (json.content || "").trim();
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed?.prompt) setPrompt(parsed.prompt.trim());
        else if (cleaned) setPrompt(cleaned);
      } catch {
        if (cleaned) setPrompt(cleaned);
      }
    } catch (err) {
      console.warn("Enhance failed:", err);
      setEnhanceError(err.message || "Enhance sikertelen");
    } finally {
      setEnhancing(false);
    }
  };

  const handleDechant = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          provider: "groq",
          messages: [
            { role: "system", content: TRELLIS_SIMPLIFY_PROMPT },
            { role: "user", content: prompt.trim() }
          ],
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 800
        }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "API hiba");
      const raw = (json.content || "").trim();
      if (raw) setPrompt(raw);
    } catch (err) {
      console.warn("Dechant failed:", err);
      setEnhanceError(err.message || "Simplify sikertelen");
    } finally {
      setEnhancing(false);
    }
  };

  return {
    prompt, setPrompt,
    genStatus, setGenStatus,
    errorMsg, setErrorMsg,
    modelUrl, setModelUrl,
    params, setParams,
    selectedStyle, setSelectedStyle,
    enhancing, setEnhancing,
    enhanceError,
    history, setHistory,
    historyLoading,
    activeItem, setActiveItem,
    handleGenerate,
    handleStop,
    handleEnhance,
    handleDechant,
    customPreset,
    handleSaveCustomPreset
  };
}
