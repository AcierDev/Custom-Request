"use client";

import * as Tabs from "@radix-ui/react-tabs";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Box, RotateCcw, RotateCw, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { launchAR } from "@/lib/ar/quickLook";
import { isIOSARCapable } from "@/lib/ar/isIOS";
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
  MECHITZA_ART_COLORS,
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  MECHITZA_FILMS,
  type MechitzaArtColor,
  type MechitzaFilm,
} from "./options";
import type { ModelSide } from "./ModelPreview";
import styles from "./page.module.css";

const ModelPreview = dynamic(() => import("./ModelPreview"), {
  ssr: false,
  loading: () => <p className={styles.modelStatus} role="status">Loading 3D preview…</p>,
});

type ARMode = "checking" | "quicklook" | "webxr" | "unavailable";

const ART_PALETTE_GROUPS = ["Light neutrals", "Earth tones", "Deep shades"] as const;

type PreviewSelection = {
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

export function MechitzaPreview({
  initialFinish,
  initialModel,
  initialFilm,
  initialArt,
}: {
  initialFinish: MechitzaFinish;
  initialModel: MechitzaModel;
  initialFilm: MechitzaFilm;
  initialArt: MechitzaArtColor;
}) {
  const [selection, setSelection] = useState<PreviewSelection>({
    model: initialModel,
    finish: initialFinish,
    film: initialFilm,
    art: initialArt,
  });
  const { model, finish, film, art } = selection;
  const [modelRequested, setModelRequested] = useState(false);
  const [view, setView] = useState<{ side: ModelSide; revision: number }>({
    side: initialFilm.id !== MECHITZA_DEFAULT_FILM.id && initialArt.id === MECHITZA_DEFAULT_ART_COLOR.id
      ? "glass"
      : "artwork",
    revision: 0,
  });
  const [observedSide, setObservedSide] = useState<ModelSide | null>(null);
  const [mode, setMode] = useState<ARMode>("checking");
  const [sessionActive, setSessionActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [arError, setArError] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const startWebXR = useRef<typeof startWebXRARSession | null>(null);
  const controller = useRef<WebXRARController | null>(null);
  const mounted = useRef(false);
  const hasPhoto = film.id === MECHITZA_DEFAULT_FILM.id && art.id === MECHITZA_DEFAULT_ART_COLOR.id;
  const showModel = modelRequested || !hasPhoto;
  const canUseAR = mode === "quicklook" || mode === "webxr";
  const assets = getMechitzaAssets(model.id, finish.id, film.id, art.id);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    if (isIOSARCapable()) {
      setMode("quicklook");
    } else if (!navigator.xr) {
      setMode("unavailable");
    } else {
      void import("@/lib/ar/webxrSession").then(async (webxr) => {
        const supported = await webxr.isWebXRARSupported();
        if (!active) return;
        if (supported) startWebXR.current = webxr.startWebXRARSession;
        setMode(supported ? "webxr" : "unavailable");
      }).catch(() => {
        if (active) setMode("unavailable");
      });
    }

    return () => {
      active = false;
      mounted.current = false;
      controller.current?.end();
    };
  }, []);

  function openAR() {
    setArError(false);
    if (mode === "quicklook") {
      launchAR(assets.usdz, window.location.href);
      return;
    }

    if (mode !== "webxr" || !overlay.current || !startWebXR.current || sessionActive) return;
    setSessionActive(true);
    setPlaced(false);
    void startWebXR.current({
      floorModelUrl: appPath(assets.glb),
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
        setArError(true);
      }
    });
  }

  function viewSide(side: ModelSide) {
    setView((previous) => ({ side, revision: previous.revision + 1 }));
  }

  function onMaterialTabChange(tab: string) {
    if (tab === "art") {
      setModelRequested(true);
      viewSide("artwork");
    } else if (tab === "film") {
      viewSide("glass");
    }
  }

  function selectPreview(changes: Partial<PreviewSelection>) {
    const next = { ...selection, ...changes };
    setSelection(next);
    if (changes.art) {
      setModelRequested(true);
      viewSide("artwork");
    } else if (changes.film) {
      setModelRequested(true);
      viewSide("glass");
    }

    const url = new URL(window.location.href);
    const params = [
      ["finish", next.finish.id, MECHITZA_DEFAULT_FINISH.id],
      ["arrangement", next.model.id, MECHITZA_MODELS[0].id],
      ["film", next.film.id, MECHITZA_DEFAULT_FILM.id],
      ["art", next.art.id, MECHITZA_DEFAULT_ART_COLOR.id],
    ];
    for (const [key, value, defaultValue] of params) {
      if (value === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", url);
  }

  return (
    <section className={styles.feature} aria-labelledby="mechitza-title">
      <div className={styles.intro}>
        <p className={styles.finish}>{film.label}</p>
        <h1 id="mechitza-title">Mechitza V10</h1>
      </div>

      <figure className={styles.visualGroup} aria-label={showModel ? "Interactive model of the selected arrangement" : "Mechitza with Linen Marquetry glass"}>
        <div className={styles.visual}>
          {showModel ? (
            <ModelPreview
              url={assets.glb}
              arrangement={model.id}
              view={view}
              hasPhoto={hasPhoto}
              onSideChange={setObservedSide}
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
          <span>{finish.label} <span aria-hidden="true">·</span> {model.label}</span>
          {showModel && (
            <span className={styles.sideControls} role="group" aria-label="View a side">
              <button type="button" aria-pressed={observedSide === "glass"} onClick={() => viewSide("glass")}>Glass side</button>
              <button type="button" aria-pressed={observedSide === "artwork"} onClick={() => viewSide("artwork")}>Artwork side</button>
            </span>
          )}
        </figcaption>
      </figure>

      <div className={styles.actions}>
        {(canUseAR || hasPhoto) && (
          <div className={styles.actionButtons}>
            {canUseAR && (
              <button className={styles.primaryButton} type="button" onClick={openAR} disabled={sessionActive}>
                <ScanLine size={19} aria-hidden /> {sessionActive ? "Opening AR…" : "Place in your room"}
              </button>
            )}
            {hasPhoto && (
              <button
                className={canUseAR ? styles.secondaryButton : styles.primaryButton}
                type="button"
                aria-pressed={showModel}
                onClick={() => setModelRequested((active) => !active)}
              >
                <Box size={18} aria-hidden /> {showModel ? "Back to photos" : "View in 3D"}
              </button>
            )}
          </div>
        )}
        {arError && <p className={styles.arNote} role="alert">AR couldn’t start. Try again or use the 3D preview.</p>}
        {mode === "unavailable" && <p className={styles.arNote}>For full-scale AR, open this page on an iPhone, iPad, or compatible Android phone.</p>}
        {canUseAR && !arError && <p className={styles.arNote}>Places the selected arrangement on your floor at full size.</p>}
      </div>

      <div className={styles.configuration}>
        <Tabs.Root
          activationMode="manual"
          defaultValue={
            initialArt.id !== MECHITZA_DEFAULT_ART_COLOR.id ? "art" :
            initialFilm.id !== MECHITZA_DEFAULT_FILM.id ? "film" : "wood"
          }
          onValueChange={onMaterialTabChange}
        >
          <Tabs.List className={styles.customizationTabs} aria-label="Mechitza materials">
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
            <fieldset className={styles.options}>
              <legend className="sr-only">Glass design</legend>
              <div className={styles.finishGrid}>
                {MECHITZA_FILMS.map((design) => (
                  <label className={`${styles.finishChoice} ${styles.filmChoice}`} key={design.id}>
                    <input
                      type="radio"
                      name="glass-design"
                      checked={film.id === design.id}
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
          </Tabs.Content>
          <Tabs.Content className={styles.customizationPanel} value="art">
            <div className={styles.paletteGroups}>
              {ART_PALETTE_GROUPS.map((group) => (
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
          </Tabs.Content>
        </Tabs.Root>

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
                  <small>{choice.width} wide</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <dl className={styles.dimensions}>
          <div><dt>Width</dt><dd>{model.width}</dd></div>
          <div><dt>Depth</dt><dd>23 in</dd></div>
          <div><dt>Height</dt><dd>75⅜ in</dd></div>
        </dl>
      </div>

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
