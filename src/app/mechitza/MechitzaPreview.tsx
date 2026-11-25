"use client";

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
import styles from "./page.module.css";

const ModelPreview = dynamic(() => import("./ModelPreview"), {
  ssr: false,
  loading: () => <p className={styles.modelStatus} role="status">Loading 3D preview…</p>,
});

type ARMode = "checking" | "quicklook" | "webxr" | "unavailable";

export function MechitzaPreview({
  initialFinish,
  initialModel,
}: {
  initialFinish: MechitzaFinish;
  initialModel: MechitzaModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [finish, setFinish] = useState(initialFinish);
  const [showModel, setShowModel] = useState(false);
  const [mode, setMode] = useState<ARMode>("checking");
  const [sessionActive, setSessionActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [arError, setArError] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const startWebXR = useRef<typeof startWebXRARSession | null>(null);
  const controller = useRef<WebXRARController | null>(null);
  const mounted = useRef(false);
  const assets = getMechitzaAssets(model.id, finish.id);

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

  function selectPreview(choice: MechitzaModel, wood: MechitzaFinish) {
    setModel(choice);
    setFinish(wood);

    const url = new URL(window.location.href);
    if (wood.id === MECHITZA_DEFAULT_FINISH.id) url.searchParams.delete("finish");
    else url.searchParams.set("finish", wood.id);
    if (choice.id === "one") url.searchParams.delete("arrangement");
    else url.searchParams.set("arrangement", choice.id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className={styles.feature}>
      <section className={styles.details} aria-labelledby="mechitza-title">
        <div>
          <p className={styles.finish}>Linen Marquetry</p>
          <h1 id="mechitza-title">Mechitza V10</h1>
          <p className={styles.description}>
            A freestanding divider with navy Everwood relief, a wood frame, and patterned upper glass.
          </p>
          <p className={styles.privacyNote}>Privacy is simulated. Actual visibility depends on room lighting.</p>
        </div>

        <fieldset className={styles.options}>
          <legend>Wood finish</legend>
          <div className={styles.finishGrid}>
            {MECHITZA_FINISHES.map((wood) => (
              <label className={styles.finishChoice} key={wood.id}>
                <input
                  type="radio"
                  name="wood-finish"
                  checked={finish.id === wood.id}
                  onChange={() => selectPreview(model, wood)}
                />
                <span className={styles.swatch} style={{ backgroundColor: wood.swatch }} aria-hidden />
                <span>{wood.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.options}>
          <legend>Arrangement</legend>
          <div className={styles.choiceGrid}>
            {MECHITZA_MODELS.map((choice) => (
              <label className={styles.choice} key={choice.id}>
                <input
                  type="radio"
                  name="arrangement"
                  checked={model.id === choice.id}
                  onChange={() => selectPreview(choice, finish)}
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

        <div className={styles.actions}>
          {(mode === "quicklook" || mode === "webxr") && (
            <button className={styles.primaryButton} type="button" onClick={openAR} disabled={sessionActive}>
              <ScanLine size={19} aria-hidden /> {sessionActive ? "Opening AR…" : "Place in your room"}
            </button>
          )}
          <button
            className={mode === "quicklook" || mode === "webxr" ? styles.secondaryButton : styles.primaryButton}
            type="button"
            aria-pressed={showModel}
            onClick={() => setShowModel((active) => !active)}
          >
            <Box size={18} aria-hidden /> {showModel ? "Back to photos" : "View in 3D"}
          </button>
          {arError && <p className={styles.arNote} role="alert">AR couldn’t start. Try again or use the 3D preview.</p>}
          {mode === "unavailable" && <p className={styles.arNote}>For full-scale AR, open this page on an iPhone, iPad, or compatible Android phone.</p>}
          {(mode === "quicklook" || mode === "webxr") && !arError && (
            <p className={styles.arNote}>Places the selected arrangement on your floor at full size.</p>
          )}
        </div>
      </section>

      <figure className={styles.visual} aria-label={showModel ? "Interactive model of the selected arrangement" : "Linen Marquetry Mechitza"}>
        {showModel ? (
          <ModelPreview key={assets.glb} url={assets.glb} />
        ) : (
          <Image
            src={appPath(assets.poster)}
            alt={`Mechitza V10 with Linen Marquetry privacy film, ${model.label.toLowerCase()}, ${finish.label} finish`}
            fill
            unoptimized
            preload={model.id === initialModel.id && finish.id === initialFinish.id}
            className={styles.photo}
          />
        )}
        {showModel && <figcaption className={styles.caption}>Drag to rotate · Scroll or pinch to zoom</figcaption>}
      </figure>

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
    </div>
  );
}
