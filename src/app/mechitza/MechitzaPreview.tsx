"use client";

import * as Tabs from "@radix-ui/react-tabs";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Box, ChevronDown, ImagePlus, Layers3, RotateCcw, RotateCw, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { launchAR } from "@/lib/ar/quickLook";
import { isIOSARCapable } from "@/lib/ar/isIOS";
import { getSceneViewerIntent, SCENE_VIEWER_FALLBACK_HASH } from "@/lib/ar/sceneViewer";
import type { startWebXRARSession, WebXRARController } from "@/lib/ar/webxrSession";
import { appPath } from "@/lib/appPaths";
import {
  MECHITZA_DEFAULT_FINISH,
  MECHITZA_FINISHES,
  MECHITZA_MODELS,
  getMechitzaAssets,
  type MechitzaFinish,
  type MechitzaModel,
} from "./models";
import {
  artworkHexToRgb,
  artworkRgbToHex,
  findMechitzaArtColor,
  MECHITZA_ART_COLORS,
  MECHITZA_ART_GROUPS,
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  MECHITZA_FILMS,
  normalizeArtworkHex,
  type MechitzaArtColor,
  type MechitzaFilm,
} from "./options";
import { MECHITZA_MODEL_RELEASE } from "./modelRelease";
import { BALLAST_DESCRIPTION, EXPLODED_PART_LABELS } from "./explodedParts";
import type { ModelSide } from "./ModelPreview";
import type { FilmCrop } from "./customFilm";
import { FilmCropDialog } from "./FilmCropDialog";
import { SelectionFiles, type SelectionFileState } from "./SelectionFiles";
import styles from "./page.module.css";

const ModelPreview = dynamic(() => import("./ModelPreview"), {
  ssr: false,
  loading: () => <p className={styles.modelStatus} role="status">Loading 3D preview…</p>,
});

type ARMode = "checking" | "quicklook" | "webxr" | "scene-viewer" | "unavailable";

type CustomFilm = { name: string; image: Blob; revision: number; source?: File; crop?: FilmCrop };

type PreviewSelection = {
  customFilm?: CustomFilm;
  people: boolean;
  model: MechitzaModel;
  finish: MechitzaFinish;
  film: MechitzaFilm;
  art: MechitzaArtColor;
};

function ColorOptions<T extends { id: string; label: string; swatch: string }>({
  label,
  name,
  options,
  value,
  onChange,
  showLabel = false,
}: {
  label: string;
  name: string;
  options: readonly T[];
  value: string;
  onChange: (option: T) => void;
  showLabel?: boolean;
}) {
  return (
    <fieldset className={styles.options}>
      <legend className={showLabel ? styles.paletteLabel : "sr-only"}>{label}</legend>
      <div className={styles.finishGrid}>
        {options.map((option) => (
          <label className={styles.finishChoice} key={option.id}>
            <input
              type="radio"
              name={name}
              checked={value === option.id}
              onChange={() => onChange(option)}
            />
            <span className={styles.swatch} style={{ backgroundColor: option.swatch }} aria-hidden />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CustomArtworkColor({
  art,
  onApply,
}: {
  art: MechitzaArtColor;
  onApply: (color: MechitzaArtColor) => void;
}) {
  const startingColor = art.swatch.toLowerCase();
  const [open, setOpen] = useState(art.group === "Custom");
  const [hex, setHex] = useState(startingColor);
  const [rgb, setRgb] = useState(() => artworkHexToRgb(startingColor));
  const [lastEdited, setLastEdited] = useState<"hex" | "rgb">("hex");
  const [showError, setShowError] = useState(false);
  const value = lastEdited === "hex" ? normalizeArtworkHex(hex) : artworkRgbToHex(rgb);
  const committed = art.group === "Custom" && value === art.swatch;

  function editHex(next: string) {
    setLastEdited("hex");
    setHex(next);
    setShowError(false);
    const clean = normalizeArtworkHex(next);
    if (clean) setRgb(artworkHexToRgb(clean));
  }

  function editRgb(next: string) {
    setLastEdited("rgb");
    setRgb(next);
    setShowError(false);
    const clean = artworkRgbToHex(next);
    if (clean) setHex(clean);
  }

  return (
    <div className={styles.customColor}>
      <button
        type="button"
        className={styles.customColorToggle}
        aria-controls="mechitza-custom-color"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.swatch} style={{ background: art.group === "Custom" ? art.swatch : undefined }} aria-hidden />
        <span>Custom color</span>
        {art.group === "Custom" && <span className={styles.customColorValue}>{art.swatch.toUpperCase()}</span>}
        <ChevronDown size={16} aria-hidden />
      </button>
      <form
        id="mechitza-custom-color"
        className={styles.customColorForm}
        hidden={!open}
        onSubmit={(event) => {
          event.preventDefault();
          if (!value) {
            setShowError(true);
            return;
          }
          const color = findMechitzaArtColor(`custom-${value.slice(1)}`);
          if (color && !committed) onApply(color);
        }}
      >
        <input
          className={styles.customColorPicker}
          type="color"
          aria-label="Pick an artwork color"
          value={value ?? normalizeArtworkHex(hex) ?? startingColor}
          onChange={(event) => editHex(event.target.value)}
        />
        <label>
          HEX
          <input
            type="text"
            placeholder="#22406B"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={showError && lastEdited === "hex"}
            value={hex}
            onChange={(event) => editHex(event.target.value)}
          />
        </label>
        <label>
          RGB
          <input
            type="text"
            placeholder="34, 64, 107"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={showError && lastEdited === "rgb"}
            value={rgb}
            onChange={(event) => editRgb(event.target.value)}
          />
        </label>
        <button type="submit" className={styles.applyColor} disabled={committed}>{committed ? "Applied" : "Apply"}</button>
        {showError && (
          <p role="alert" className={styles.colorError}>
            {lastEdited === "hex" ? "Enter a HEX color such as #22406B." : "Enter three RGB values from 0 to 255."}
          </p>
        )}
      </form>
    </div>
  );
}

export function MechitzaPreview({
  initialFinish,
  initialModel,
  initialFilm,
  initialArt,
  initialPeople,
}: {
  initialFinish: MechitzaFinish;
  initialModel: MechitzaModel;
  initialFilm: MechitzaFilm;
  initialArt: MechitzaArtColor;
  initialPeople: boolean;
}) {
  const [selection, setSelection] = useState<PreviewSelection>({
    model: initialModel,
    finish: initialFinish,
    film: initialFilm,
    art: initialArt,
    people: initialPeople,
  });
  const currentSelection = useRef(selection);
  const { model, finish, film, art, people, customFilm } = selection;
  const [filmToCrop, setFilmToCrop] = useState<File | null>(null);
  const [loadedSelection, setLoadedSelection] = useState(0);
  const filmInput = useRef<HTMLInputElement>(null);
  const uploadRevision = useRef(0);
  const [materialTab, setMaterialTab] = useState(
    initialArt.id !== MECHITZA_DEFAULT_ART_COLOR.id ? "art" :
      initialFilm.id !== MECHITZA_DEFAULT_FILM.id ? "film" : "wood",
  );
  const [preparedAR, setPreparedAR] = useState<{ key: string; url: string; expiresAt: number }>();
  const [failedARKey, setFailedARKey] = useState<string>();
  const [arAttempt, setArAttempt] = useState(0);
  const [modelRequested, setModelRequested] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [view, setView] = useState<{ side: ModelSide; revision: number }>({
    side: initialFilm.id !== MECHITZA_DEFAULT_FILM.id && initialArt.id === MECHITZA_DEFAULT_ART_COLOR.id
      ? "glass"
      : "artwork",
    revision: 0,
  });
  const [highlightedSide, setHighlightedSide] = useState<ModelSide | null>(null);
  const [mode, setMode] = useState<ARMode>("checking");
  const [sessionActive, setSessionActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [arError, setArError] = useState(false);
  const [sceneViewerFallback, setSceneViewerFallback] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const modelSurface = useRef<HTMLDivElement>(null);
  const startWebXR = useRef<typeof startWebXRARSession | null>(null);
  const controller = useRef<WebXRARController | null>(null);
  const mounted = useRef(false);
  const hasPhoto = !customFilm && film.id === MECHITZA_DEFAULT_FILM.id && art.id === MECHITZA_DEFAULT_ART_COLOR.id;
  const showModel = modelRequested || !hasPhoto;
  const canUseAR = mode === "quicklook" || mode === "webxr" || mode === "scene-viewer";
  const assets = getMechitzaAssets(model.id, finish.id, film.id, art.id, people);
  const modelUrl = customFilm ? `${assets.glb}&upload=${customFilm.revision}` : assets.glb;
  const deviceModel = mode === "quicklook" ? assets.usdz : assets.glb;
  const arKey = customFilm && canUseAR ? `${deviceModel}&upload=${customFilm.revision}&attempt=${arAttempt}` : undefined;
  const customAR = preparedAR?.key === arKey ? preparedAR : undefined;
  const preparingAR = Boolean(arKey && !customAR && failedARKey !== arKey);
  const sceneViewerIntent = mode === "scene-viewer" && (!customFilm || customAR)
    ? getSceneViewerIntent(appPath(customAR?.url ?? assets.glb), window.location.href)
    : null;

  useEffect(() => {
    if (!arKey || !customFilm) return;
    const request = new AbortController();
    fetch(appPath(`${deviceModel}&prepare=1`), {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: customFilm.image,
      signal: request.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("Custom AR model preparation failed");
      const { url, expiresAt } = await response.json();
      if (typeof url !== "string" || !url.startsWith(appPath("/api/mechitza-model/")) || !Number.isFinite(Date.parse(expiresAt))) {
        throw new Error("Invalid AR model response");
      }
      if (!request.signal.aborted) setPreparedAR({ key: arKey, url, expiresAt: Date.parse(expiresAt) });
    }).catch(() => {
      if (!request.signal.aborted) setFailedARKey(arKey);
    });
    return () => request.abort();
  }, [arKey, customFilm, deviceModel]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const androidAR = /Android/i.test(navigator.userAgent) && window.location.protocol === "https:";
    const fallbackMode = androidAR ? "scene-viewer" : "unavailable";
    const reportFallback = () => setSceneViewerFallback(window.location.hash === SCENE_VIEWER_FALLBACK_HASH);
    reportFallback();
    window.addEventListener("hashchange", reportFallback);
    if (!androidAR && isIOSARCapable()) {
      setMode("quicklook");
    } else if (!navigator.xr) {
      setMode(fallbackMode);
    } else {
      void import("@/lib/ar/webxrSession").then(async (webxr) => {
        const supported = await webxr.isWebXRARSupported();
        if (!active) return;
        if (supported) startWebXR.current = webxr.startWebXRARSession;
        setMode(supported ? "webxr" : fallbackMode);
      }).catch(() => {
        if (active) setMode(fallbackMode);
      });
    }

    return () => {
      active = false;
      mounted.current = false;
      window.removeEventListener("hashchange", reportFallback);
      controller.current?.end();
    };
  }, []);

  function openAR() {
    setArError(false);
    if (customFilm && (!customAR || customAR.expiresAt - Date.now() < 15_000)) {
      setArAttempt((attempt) => attempt + 1);
      return;
    }

    if (mode === "quicklook") {
      launchAR(customAR?.url ?? assets.usdz, window.location.href);
      return;
    }

    if (mode !== "webxr" || !overlay.current || !startWebXR.current || sessionActive) return;
    setSessionActive(true);
    setPlaced(false);
    void startWebXR.current({
      floorModelUrl: appPath(customAR?.url ?? assets.glb),
      overlayRoot: overlay.current,
      onPlacedChange: setPlaced,
      onEnd: () => {
        controller.current = null;
        if (mounted.current) {
          setSessionReady(false);
          setSessionActive(false);
        }
      },
    }).then((activeController) => {
      if (mounted.current) {
        controller.current = activeController;
        setSessionReady(true);
      } else {
        activeController.end();
      }
    }).catch(() => {
      if (mounted.current) {
        setSessionActive(false);
        if (/Android/i.test(navigator.userAgent) && window.location.protocol === "https:") setMode("scene-viewer");
        setArError(true);
      }
    });
  }

  function viewSide(side: ModelSide, highlight = false) {
    setHighlightedSide(highlight ? side : null);
    setView((previous) => ({ side, revision: previous.revision + 1 }));
  }

  function onMaterialTabChange(tab: string) {
    setMaterialTab(tab);
    if (tab === "art") {
      setModelRequested(true);
      viewSide("artwork");
    } else if (tab === "film") {
      viewSide("glass");
    }
  }

  function selectPreview(changes: Partial<PreviewSelection>) {
    const next = { ...currentSelection.current, ...changes };
    if (changes.film && !("customFilm" in changes)) {
      next.customFilm = undefined;
      setFilmToCrop(null);
    }
    currentSelection.current = next;
    setSelection(next);
    if (changes.film || "customFilm" in changes || changes.art) {
      setModelRequested(true);
      viewSide(changes.film || "customFilm" in changes ? "glass" : "artwork");
    }

    const url = new URL(window.location.href);
    const params = [
      ["finish", next.finish.id, MECHITZA_DEFAULT_FINISH.id],
      ["arrangement", next.model.id, MECHITZA_MODELS[0].id],
      ["film", next.film.id, MECHITZA_DEFAULT_FILM.id],
      ["art", next.art.id, MECHITZA_DEFAULT_ART_COLOR.id],
      ["people", next.people ? "1" : "0", "0"],
    ];
    for (const [key, value, defaultValue] of params) {
      if (value === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", url);
  }

  function applyFilmCrop(image: Blob, crop: FilmCrop) {
    if (!filmToCrop) return;
    const revision = ++uploadRevision.current;
    selectPreview({ customFilm: { name: filmToCrop.name, source: filmToCrop, image, revision, crop } });
    setFilmToCrop(null);
  }

  function loadSelection(saved: SelectionFileState) {
    const revision = ++uploadRevision.current;
    setLoadedSelection(revision);
    setFilmToCrop(null);
    const hasCustomGlass = Boolean(saved.customFilm);
    setMaterialTab(hasCustomGlass ? "film" : "wood");
    selectPreview({
      ...saved,
      customFilm: saved.customFilm ? { ...saved.customFilm, revision } : undefined,
    });
    if (!hasCustomGlass && saved.art.id !== MECHITZA_DEFAULT_ART_COLOR.id) {
      setMaterialTab("art");
      viewSide("artwork");
    } else if (!hasCustomGlass && saved.film.id !== MECHITZA_DEFAULT_FILM.id) {
      setMaterialTab("film");
    }
  }

  const explodedLegend = (
    <div
      className={styles.legendRegion}
      data-open={exploded || undefined}
      aria-hidden={!exploded}
    >
      <div>
        <ol className={styles.explodedLegend} aria-label="Exploded view components">
          {EXPLODED_PART_LABELS.map((label, index) => (
            <li key={label}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{label}</li>
          ))}
        </ol>
        <p className={styles.ballastNote}>{BALLAST_DESCRIPTION}</p>
      </div>
    </div>
  );

  return (
    <section className={styles.feature} aria-labelledby="mechitza-title">
      <div className={styles.intro}>
        <h1 id="mechitza-title">Mechitza V10</h1>
      </div>

      <figure className={styles.visualGroup} data-model-release={MECHITZA_MODEL_RELEASE.id} aria-label={showModel ? "Interactive model of the selected arrangement" : "Mechitza with Linen Marquetry glass"}>
        <div ref={modelSurface} className={styles.visual} data-interactive={showModel || undefined}>
          {showModel ? (
            <ModelPreview
              url={modelUrl}
              filmImage={customFilm?.image}
              surface={modelSurface}
              arrangement={people ? model.id : `${model.id}-divider`}
              view={view}
              hasPhoto={hasPhoto}
              exploded={exploded}
              onOrbit={() => setHighlightedSide(null)}
            />
          ) : (
            <Image
              src={appPath(assets.poster)}
              alt={`Mechitza V10 with Linen Marquetry privacy film, ${model.label.toLowerCase()}, ${finish.label} finish`}
              fill
              unoptimized
              draggable={false}
              preload={model.id === initialModel.id && finish.id === initialFinish.id}
              className={styles.photo}
            />
          )}
        </div>
        <figcaption className={styles.caption}>
          <dl className={styles.dimensions}>
            <div><dt>Width</dt><dd>{model.width}</dd></div>
            <div><dt>Depth</dt><dd>{MECHITZA_MODEL_RELEASE.depthInches} in</dd></div>
            <div><dt>Height</dt><dd>75⅜ in</dd></div>
          </dl>
          {(showModel || canUseAR) && (
            <div className={styles.previewControls}>
              {showModel && (
                <div className={styles.sideControls} role="group" aria-label="View a side">
                  <button type="button" aria-pressed={highlightedSide === "glass"} onClick={() => viewSide("glass", true)}>Men’s side</button>
                  <button type="button" aria-pressed={highlightedSide === "artwork"} onClick={() => viewSide("artwork", true)}>Women’s side</button>
                </div>
              )}
              <button
                className={styles.peopleToggle}
                type="button"
                role="switch"
                aria-checked={people}
                onClick={() => selectPreview({ people: !people })}
              >
                {showModel ? "People" : "People in AR"}
                <span className={styles.switchTrack} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className={styles.desktopLegend}>{explodedLegend}</div>
        </figcaption>
      </figure>

      <div className={styles.actions}>
        <div className={styles.actionButtons}>
          {sceneViewerIntent ? (
            <a
              className={styles.primaryButton}
              href={sceneViewerIntent}
              onClick={(event) => {
                setArError(false);
                if (window.location.hash === SCENE_VIEWER_FALLBACK_HASH) {
                  const url = new URL(window.location.href);
                  url.hash = "";
                  window.history.replaceState(window.history.state, "", url);
                  setSceneViewerFallback(false);
                }
                if (customAR && customAR.expiresAt - Date.now() < 15_000) {
                  event.preventDefault();
                  setArAttempt((attempt) => attempt + 1);
                }
              }}
            >
              <ScanLine size={19} aria-hidden /> Place in your room
            </a>
          ) : canUseAR && (
            <button className={styles.primaryButton} type="button" onClick={openAR} disabled={sessionActive || preparingAR}>
              <ScanLine size={19} aria-hidden />
              {preparingAR ? "Preparing AR…" : sessionActive ? "Opening AR…" : "Place in your room"}
            </button>
          )}
          {hasPhoto && (
            <button
              className={canUseAR ? styles.secondaryButton : styles.primaryButton}
              type="button"
              aria-pressed={showModel}
              onClick={() => {
                setModelRequested(!showModel);
                if (showModel) {
                  setExploded(false);
                  setHighlightedSide(null);
                }
              }}
            >
              <Box size={18} aria-hidden /> {showModel ? "Back to photos" : "View in 3D"}
            </button>
          )}
          <button
            className={styles.secondaryButton}
            type="button"
            aria-pressed={exploded}
            onClick={() => {
              setModelRequested(true);
              setExploded(!exploded);
            }}
          >
            <Layers3 size={18} aria-hidden /> {exploded ? "Reassemble" : "Exploded view"}
          </button>
        </div>
        {sceneViewerFallback && (
          <p className={styles.arNote} role="alert">Android AR couldn’t open. Try Chrome with Google Play Services for AR, or use the 3D preview.</p>
        )}
        {arError && !sceneViewerFallback && (
          <p className={styles.arNote} role="alert">
            {mode === "scene-viewer" ? "Browser AR couldn’t start. Tap Place in your room to try Android AR." : "AR couldn’t start. Try again or use the 3D preview."}
          </p>
        )}
        {arKey && failedARKey === arKey && (
          <p className={styles.arNote} role="alert">The custom glass couldn’t be prepared for AR. Tap Place in your room to retry.</p>
        )}
        {mode === "unavailable" && <p className={styles.arNote}>Open on your phone for full-scale AR.</p>}
        <div className={styles.mobileLegend}>{explodedLegend}</div>
      </div>

      <div className={styles.configuration}>
        <fieldset className={styles.options}>
          <legend>Arrangement</legend>
          <div className={styles.choiceGrid}>
            {MECHITZA_MODELS.map((choice) => (
              <label className={styles.choice} key={choice.id}>
                <input
                  type="radio"
                  name="arrangement"
                  checked={model.id === choice.id}
                  onChange={() => selectPreview({ model: choice })}
                />
                <span>
                  <strong>{choice.label}</strong>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Tabs.Root
          activationMode="manual"
          value={materialTab}
          onValueChange={onMaterialTabChange}
        >
          <p id="mechitza-material-note" className={styles.materialNote}>
            Sample options. Other finishes, glass designs, and artwork colors are available by request.
          </p>
          <Tabs.List
            className={styles.customizationTabs}
            aria-label="Mechitza materials"
            aria-describedby="mechitza-material-note"
          >
            <Tabs.Trigger className={styles.customizationTab} value="wood">Wood finish</Tabs.Trigger>
            <Tabs.Trigger className={styles.customizationTab} value="film">Glass design</Tabs.Trigger>
            <Tabs.Trigger className={styles.customizationTab} value="art">Artwork color</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content className={styles.customizationPanel} value="wood">
            <ColorOptions
              label="Wood finish"
              name="wood-finish"
              options={MECHITZA_FINISHES}
              value={finish.id}
              onChange={(wood) => selectPreview({ finish: wood })}
            />
          </Tabs.Content>
          <Tabs.Content className={styles.customizationPanel} value="film">
            <p className={styles.materialNote}>The women’s side has a see-through charcoal backing.</p>
            <fieldset className={styles.options}>
              <legend className="sr-only">Glass design</legend>
              <div className={styles.finishGrid}>
                {MECHITZA_FILMS.map((design) => (
                  <label className={`${styles.finishChoice} ${styles.filmChoice}`} key={design.id}>
                    <input
                      type="radio"
                      name="glass-design"
                      checked={!customFilm && film.id === design.id}
                      onChange={() => selectPreview({ film: design })}
                    />
                    <Image
                      className={styles.filmThumbnail}
                      src={appPath(`/mechitza-films/${design.id}.jpg`)}
                      alt=""
                      width={96}
                      height={56}
                      unoptimized
                      draggable={false}
                    />
                    <span>{design.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={styles.filmUpload}>
              <input
                ref={filmInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) setFilmToCrop(file);
                }}
              />
              <button type="button" className={styles.secondaryButton} onClick={() => filmInput.current?.click()}>
                <ImagePlus size={17} aria-hidden /> {customFilm ? "Replace image" : "Upload your image"}
              </button>
              {customFilm?.source && (
                <button type="button" className={styles.removeFilm} onClick={() => setFilmToCrop(customFilm.source ?? null)}>Adjust crop</button>
              )}
              {customFilm && (
                <button type="button" className={styles.removeFilm} onClick={() => selectPreview({ film })}>Remove image</button>
              )}
              <p className={styles.filmUploadDetail}>{customFilm?.name ?? "The image is cropped to fit the glass."}</p>
            </div>
          </Tabs.Content>
          <Tabs.Content className={styles.customizationPanel} value="art">
            <div className={styles.paletteGroups}>
              {MECHITZA_ART_GROUPS.map((group) => (
                <ColorOptions
                  key={group}
                  label={group}
                  name="artwork-color"
                  options={MECHITZA_ART_COLORS.filter((color) => color.group === group)}
                  value={art.id}
                  onChange={(color) => selectPreview({ art: color })}
                  showLabel
                />
              ))}
            </div>
            <CustomArtworkColor key={loadedSelection} art={art} onApply={(color) => selectPreview({ art: color })} />
          </Tabs.Content>
        </Tabs.Root>
        <SelectionFiles selection={selection} onLoad={loadSelection} />
      </div>

      {filmToCrop && (
        <FilmCropDialog
          file={filmToCrop}
          initialCrop={filmToCrop === customFilm?.source ? customFilm.crop : undefined}
          onApply={applyFilmCrop}
          onCancel={() => setFilmToCrop(null)}
        />
      )}
      {mode === "webxr" && createPortal(
        <div ref={overlay} className={styles.xrOverlay}>
          {sessionActive && (
            <div className={styles.xrControls}>
              {!placed && <p>Point at the floor, then tap to place.</p>}
              <div>
                {placed && (
                  <>
                    <button type="button" onClick={() => controller.current?.reset()}>
                      <RotateCcw size={17} aria-hidden /> Re-place
                    </button>
                    <button type="button" onClick={() => controller.current?.rotate(Math.PI / 2)}>
                      <RotateCw size={17} aria-hidden /> Rotate
                    </button>
                  </>
                )}
                <button type="button" disabled={!sessionReady} onClick={() => controller.current?.end()}>
                  <X size={17} aria-hidden /> Exit AR
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </section>
  );
}
