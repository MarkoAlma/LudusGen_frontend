import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Zap, Wand2, AlertCircle, Eye, Sparkles } from 'lucide-react';
import { API_BASE, authHeaders } from '../api/client';

function Tooltip({ text, children, side = 'top' }) {
  const [show, setShow] = useState(false);
  const arrowBorder =
    side === 'top'
      ? { borderTop: 'none', borderLeft: 'none' }
      : { borderRight: 'none', borderBottom: 'none' };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div style={{
          position: 'absolute',
          [side === 'top' ? 'bottom' : 'top']: '100%',
          left: '50%', transform: 'translateX(-50%) translateY(0)',
          marginBottom: side === 'top' ? 9 : 0, marginTop: side === 'bottom' ? 9 : 0,
          padding: '5px 10px', background: 'rgba(8,8,18,0.97)', color: '#e2e8f0',
          fontSize: 10, fontWeight: 500, borderRadius: 7, whiteSpace: 'nowrap',
          zIndex: 1000, pointerEvents: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.09)', letterSpacing: '0.01em',
          animation: 'tooltipFadeIn 0.12s ease-out forwards',
        }}>
          <style>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateX(-50%) ${side === 'top' ? 'translateY(4px)' : 'translateY(-4px)'}; }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          {text}
          <div style={{
            position: 'absolute',
            [side === 'top' ? 'bottom' : 'top']: -4,
            left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: 7, height: 7, background: 'rgba(8,8,18,0.97)',
            border: '1px solid rgba(255,255,255,0.09)', ...arrowBorder,
          }} />
        </div>
      )}
    </div>
  );
}

const MAX_CHARS = 850;

function trimToLimit(text, limit = 850) {
  if (text.length <= limit) return text;
  const cut = text.lastIndexOf(",", limit);
  return cut > 0 ? text.slice(0, cut).trimEnd() : text.slice(0, limit).trimEnd();
}

// ── Gemma Vision: képleírás prompt ──────────────────────────────────────────
// Ez a prompt kerül elküldésre a Gemma 3 27B IT (NVIDIA) modellnek,
// hogy strukturált vizuális leírást adjon a feltöltött képekről.
// A leírás ezután kontextusként kerül a fő edit enhancer promptba.
const GEMMA_IMAGE_DESCRIBE_PROMPT = `You are a precise visual analyst for an AI image editing pipeline.
Analyze the uploaded image(s) and provide a detailed, structured description of each one.

For EACH image, describe:
1. SUBJECTS: Who or what is in the image — species/type, physical traits (hair color/style, skin tone, eyes, build), every visible clothing item listed individually (jacket, shirt, trousers, shoes, accessories, etc.), pose, expression, position in frame
2. BACKGROUND: Environment, setting, colors, textures, depth, any objects in the background
3. LIGHTING: Direction (left/right/top/front/back), quality (soft/hard/diffuse/natural), color temperature (warm/cool/neutral)
4. NOTABLE ELEMENTS: Specific objects, accessories, props, spatial relationships between elements
5. VISUAL STYLE: Photograph/illustration/3D render/painting, color grading, artistic style if applicable

Format your response EXACTLY as:
IMAGE 1:
[detailed structured description]

IMAGE 2:
[detailed structured description]

(continue for each uploaded image)

Be specific, visual, and objective. No interpretation or creative additions. Describe only what is visually present. This description will be used by another AI model to write precise image editing instructions.`;

function Enhancer({
  value,
  onChange,
  onNegativeChange,
  onSubmit,
  color = '#818cf8',
  getIdToken,
  enhancing_prompt,
  dechanting_prompt,
  super_enhancing_prompt,   // ← opcionális super enhance prompt
  onBusyChange,
  inputImages = [],          // ← feltöltött képek [{dataUrl, name}]
  gemmaVisionPrompt = '',    // ← opcionális override; ha üres, GEMMA_IMAGE_DESCRIBE_PROMPT-ot használ
  stylePrefix = '',          // ← nem módosítható szürke prefix (pl. "[Image #1] ")
}) {
  const disabled = false;

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const [enhancing, setEnhancing] = useState(false);
  const [superEnhancing, setSuperEnhancing] = useState(false);
  const [dechanting, setDechanting] = useState(false);
  const [describingImages, setDescribingImages] = useState(false);
  const [streamError, setStreamError] = useState(null);

  const isBusy = enhancing || superEnhancing || dechanting || describingImages;

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  // ── Cerebras API hívás ───────────────────────────────────────────────────
  const callChat = useCallback(async (systemPrompt, userContent, temperature, top_p, max_tokens) => {
    const headers = await authHeaders();

    const res = await fetch(`${API_BASE}/api/enhance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        provider: 'groq',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature,
        top_p,
        max_tokens,
      }),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const j = await res.json(); errMsg = j.message || errMsg; } catch { }
      throw new Error(errMsg);
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API hiba');
    return (json.content || '').trim();
  }, [authHeaders]);

  // ── Gemma Vision API hívás (NVIDIA) ─────────────────────────────────────
  // Elküldi a feltöltött képeket a /api/vision-describe endpointnak,
  // ami a google/gemma-3-27b-it modellt hívja NVIDIA API-n keresztül.
  const callVisionDescribe = useCallback(async (images) => {
    const headers = await authHeaders();

    const res = await fetch(`${API_BASE}/api/vision-describe`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        images: images.map(img => img.dataUrl),
        systemPrompt: gemmaVisionPrompt || GEMMA_IMAGE_DESCRIBE_PROMPT,
      }),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const j = await res.json(); errMsg = j.message || errMsg; } catch { }
      throw new Error(errMsg);
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Vision describe hiba');
    return (json.description || '').trim();
  }, [authHeaders, gemmaVisionPrompt]);

  // ── AI válasz feldolgozása: JSON vagy plain string ────────────────────────
  const applyResult = useCallback((raw) => {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.prompt === 'string' && parsed.prompt.trim()) {
          onChange(trimToLimit(parsed.prompt.trim()));
          if (typeof parsed.negative_prompt === 'string' && onNegativeChange) {
            onNegativeChange(parsed.negative_prompt.trim().slice(0, 250));
          }
          return true;
        }
      }
    } catch {
      // nem JSON — plain string mód
    }

    if (raw.trim()) {
      onChange(trimToLimit(raw.trim()));
      return true;
    }

    return false;
  }, [onChange, onNegativeChange]);

  // ── Enhance ───────────────────────────────────────────────────────────────
  // Ha vannak feltöltött képek (edit mód), először Gemma leírja őket,
  // majd a leírás + felhasználói szöveg együtt megy a Cerebras edit enhancernek.
  // A stylePrefix-et mindig kiszűrjük a küldés előtt — az AI nem látja.
  const handleEnhance = useCallback(async (superMode = false) => {
    if (!value.trim() || enhancing || superEnhancing || describingImages) return;
    if (superMode) setSuperEnhancing(true);
    else setEnhancing(true);
    setStreamError(null);

    try {
      // Strip stylePrefix from the value before sending to AI
      let userContent = value.trim();
      if (stylePrefix && userContent.startsWith(stylePrefix)) {
        userContent = userContent.slice(stylePrefix.length).trim();
      }

      // Ha vannak feltöltött képek → vision describe lépés
      if (inputImages.length > 0) {
        setDescribingImages(true);
        try {
          const description = await callVisionDescribe(inputImages);
          if (description) {
            userContent =
              `USER'S EDIT INSTRUCTION:\n${userContent}\n\n` +
              `---\n` +
              `VISUAL CONTEXT — uploaded images analyzed by vision AI (Gemma 3 27B IT):\n${description}`;
          }
        } catch (vErr) {
          console.warn('Vision describe failed, falling back to text-only enhance:', vErr.message);
          setStreamError(`⚠️ Képelemzés sikertelen (${vErr.message}), csak szöveges prompttal próbálom.`);
        } finally {
          setDescribingImages(false);
        }
      }

      const systemPrompt = superMode && super_enhancing_prompt ? super_enhancing_prompt : enhancing_prompt;
      console.log('[Enchanter] system prompt:', systemPrompt);
      console.log('[Enchanter] user content:', userContent);
      const raw = await callChat(systemPrompt, userContent, 0.4, 0.9, 2048);
      console.log('[Enchanter] raw response:', raw);
      const ok = applyResult(raw);
      if (!ok) setStreamError('Az AI üres választ adott vissza — próbáld újra.');
      else if (streamError?.startsWith('⚠️')) setStreamError(null);
    } catch (err) {
      console.error('Enhance hiba:', err);
      setStreamError(err.message || 'Enhance sikertelen');
    } finally {
      setEnhancing(false);
      setSuperEnhancing(false);
      setDescribingImages(false);
    }
  }, [value, enhancing, superEnhancing, describingImages, enhancing_prompt, super_enhancing_prompt, inputImages, callChat, callVisionDescribe, applyResult, streamError, stylePrefix]);

  // ── Dechance ──────────────────────────────────────────────────────────────
  const handleDechance = useCallback(async () => {
    if (!value.trim() || dechanting) return;
    setDechanting(true);
    setStreamError(null);
    try {
      const raw = await callChat(dechanting_prompt, value.trim(), 0.4, 0.9, 800);
      const ok = applyResult(raw);
      if (!ok) setStreamError('Az AI üres választ adott vissza — próbáld újra.');
    } catch (err) {
      console.error('Dechance hiba:', err);
      setStreamError(err.message || 'Simplify sikertelen');
    } finally {
      setDechanting(false);
    }
  }, [value, dechanting, dechanting_prompt, callChat, applyResult]);

  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const prefixLen = stylePrefix.length;
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const hasContent = value.trim().length > 0;
  const hasImages = inputImages.length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !disabled && value.trim() && !isOverLimit) {
      onSubmit();
    }
  }, [disabled, value, isOverLimit, onSubmit]);

  const simplifyDisabled = !hasContent || dechanting || disabled;
  const enhanceDisabled = !hasContent || enhancing || describingImages || disabled;

  const borderColor = isOverLimit
    ? 'rgba(248,113,113,0.5)'
    : focused ? `${color}60`
      : hasContent ? `${color}30`
        : 'rgba(255,255,255,0.07)';

  const glowShadow = focused && !isOverLimit
    ? `0 0 0 3px ${color}14, 0 2px 8px rgba(0,0,0,0.5)`
    : '0 1px 3px rgba(0,0,0,0.35)';

  const fillPct = Math.min(100, ((MAX_CHARS - remaining) / MAX_CHARS) * 100);
  const barColor = isOverLimit ? '#f87171' : remaining < 100 ? '#f59e0b' : color;

  // Enhance gomb tooltip szövege
  const enhanceTooltip = !hasContent
    ? 'Írj be egy promptot először'
    : describingImages
      ? 'Képelemzés folyamatban…'
      : hasImages
        ? `AI prompt fejlesztés (${inputImages.length} kép → vision + reprompt)`
        : 'AI prompt fejlesztés';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        position: 'relative', borderRadius: 13,
        background: disabled
          ? 'rgba(255,255,255,0.01)'
          : focused ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.022)',
        border: `1px solid ${borderColor}`,
        boxShadow: glowShadow,
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        {/* Top sheen */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: focused
            ? `linear-gradient(90deg, transparent, ${color}38, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          pointerEvents: 'none', zIndex: 1, transition: 'all 0.3s',
        }} />

        {focused && !isOverLimit && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 13,
            background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 70%)`,
            pointerEvents: 'none', zIndex: 0,
          }} />
        )}

        {stylePrefix && (
          <div style={{
            padding: '10px 14px 0',
            position: 'relative', zIndex: 2,
          }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif",
              letterSpacing: '0.01em',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'pre',
            }}>
              {stylePrefix}
            </span>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); setStreamError(null); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={stylePrefix ? 'Írj le egy promptot angolul…' : 'Írj le egy promptot angolul…\npl. a rustic log cabin with a stone chimney'}
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: stylePrefix ? '8px 14px 36px 14px' : '13px 14px 36px 14px',
            resize: 'none', minHeight: 108, maxHeight: 220,
            fontSize: 12, lineHeight: 1.8,
            color: disabled ? 'rgba(229,231,235,0.3)' : '#e5e7eb',
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif",
            letterSpacing: '0.005em',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            display: 'block', position: 'relative', zIndex: 2,
          }}
        />

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', height: 32,
          borderTop: '1px solid rgba(255,255,255,0.045)',
          background: 'rgba(0,0,0,0.18)', zIndex: 3,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          }}>
            ⌘↵ generálás
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {hasContent && (
              <div style={{ width: 32, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${fillPct}%`,
                  background: barColor, transition: 'width 0.15s, background 0.2s',
                  boxShadow: `0 0 6px ${barColor}80`,
                }} />
              </div>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: "'SF Mono', monospace",
              color: isOverLimit ? '#f87171' : remaining < 100 ? '#f59e0b' : 'rgba(255,255,255,0.22)',
              minWidth: 28, textAlign: 'right', transition: 'color 0.2s', letterSpacing: '0.04em',
            }}>
              {remaining}
            </span>
          </div>
        </div>
      </div>

      {/* Vision describe folyamatban banner */}
      {describingImages && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 6, padding: '6px 10px', borderRadius: 8,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <Eye style={{ width: 11, height: 11, color: '#34d399', flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#6ee7b7', lineHeight: 1.4 }}>
            Gemma 3 27B elemzi a képeket ({inputImages.length} db)…
          </span>
          <Loader2 style={{ width: 10, height: 10, color: '#34d399', marginLeft: 'auto', flexShrink: 0, animation: 'enhancerSpin 1s linear infinite' }} />
        </div>
      )}

      {/* Hiba / warning banner */}
      {streamError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 6, padding: '6px 10px', borderRadius: 8,
          background: streamError.startsWith('⚠️')
            ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${streamError.startsWith('⚠️')
            ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          <AlertCircle style={{
            width: 11, height: 11, flexShrink: 0,
            color: streamError.startsWith('⚠️') ? '#fbbf24' : '#f87171',
          }} />
          <span style={{
            fontSize: 10, lineHeight: 1.4,
            color: streamError.startsWith('⚠️') ? '#fde68a' : '#fca5a5',
          }}>
            {streamError}
          </span>
        </div>
      )}

      {/* Kép-kontextus jelző (ha képek vannak feltöltve) */}
      {hasImages && !describingImages && !enhancing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          marginTop: 5, padding: '4px 8px', borderRadius: 6,
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
        }}>
          <Eye style={{ width: 9, height: 9, color: '#34d399', flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: '#6ee7b7', lineHeight: 1.4 }}>
            Enhance: Gemma {inputImages.length} képet elemez → Cerebras fejleszti a promptot
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 7 }}>
        <Tooltip text={!hasContent ? 'Írj be egy promptot először' : 'Prompt egyszerűsítése'} side="top">
          <ActionButton
            onClick={handleDechance}
            disabled={simplifyDisabled}
            loading={dechanting}
            accentColor="#fb923c"
            icon={<Zap style={{ width: 10, height: 10 }} />}
            label="Simplify"
            loadingLabel="Simplify…"
          />
        </Tooltip>
        <Tooltip text={enhanceTooltip} side="top">
          <ActionButton
            onClick={() => handleEnhance(false)}
            disabled={enhanceDisabled}
            loading={enhancing || describingImages}
            accentColor={color}
            icon={hasImages
              ? <><Eye style={{ width: 10, height: 10 }} /><Wand2 style={{ width: 10, height: 10 }} /></>
              : <Wand2 style={{ width: 10, height: 10 }} />
            }
            label={hasImages ? 'Enhance+Vision' : 'Enhance'}
            loadingLabel={describingImages ? 'Gemma…' : 'Enhance…'}
          />
        </Tooltip>
        {super_enhancing_prompt && (
          <Tooltip text={!hasContent ? 'Írj be egy promptot először' : 'Super Enhance — extra felület-, anyag- és konstrukciós részletek'} side="top">
            <ActionButton
              onClick={() => handleEnhance(true)}
              disabled={enhanceDisabled}
              loading={superEnhancing || describingImages}
              accentColor="#a855f7"
              icon={<Sparkles style={{ width: 10, height: 10 }} />}
              label="Super Enhance"
              loadingLabel={describingImages ? 'Gemma…' : 'Super…'}
            />
          </Tooltip>
        )}
      </div>

      <style>{`
        @keyframes enhancerSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ActionButton({ onClick, disabled, loading, accentColor, icon, label, loadingLabel }) {
  const [hovered, setHovered] = useState(false);

  const bg = loading || hovered ? `rgba(${hexToRgb(accentColor)}, 0.14)` : `rgba(${hexToRgb(accentColor)}, 0.07)`;
  const outline = hovered && !disabled ? `1px solid rgba(${hexToRgb(accentColor)}, 0.38)` : `1px solid rgba(${hexToRgb(accentColor)}, 0.16)`;
  const textColor = disabled ? `rgba(${hexToRgb(accentColor)}, 0.3)` : accentColor;
  const glow = (loading || hovered) && !disabled ? `0 0 14px rgba(${hexToRgb(accentColor)}, 0.18)` : 'none';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 11px', borderRadius: 8,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        background: bg, color: textColor, outline, boxShadow: glow,
        fontFamily: "'SF Pro Text', system-ui, sans-serif",
      }}
    >
      {loading
        ? <><Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />{loadingLabel}</>
        : <>{icon}{label}</>
      }
    </button>
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default React.memo(Enhancer);