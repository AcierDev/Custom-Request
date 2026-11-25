"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { MECHITZA_FINISHES, MECHITZA_MODELS, type MechitzaFinish, type MechitzaModel } from "./models";
import { findMechitzaArtColor, MECHITZA_FILMS, type MechitzaArtColor, type MechitzaFilm } from "./options";
import {
  MAX_SAVED_MECHITZA_BYTES,
  mechitzaSelectionFilename,
  parseMechitzaSelection,
  serializeMechitzaSelection,
} from "./savedSelection";
import styles from "./page.module.css";

export type SelectionFileState = {
  model: MechitzaModel;
  finish: MechitzaFinish;
  film: MechitzaFilm;
  art: MechitzaArtColor;
  people: boolean;
  customFilm?: { name: string; image: Blob };
};

async function encodeTexture(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function SelectionFiles({
  selection,
  onLoad,
}: {
  selection: SelectionFileState;
  onLoad: (selection: SelectionFileState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setStatus("");
    try {
      const { model, finish, film, art, people, customFilm } = selection;
      const saved = {
        arrangement: model.id,
        finish: finish.id,
        film: film.id,
        art: art.id,
        people,
        customFilm: customFilm ? { name: customFilm.name, data: await encodeTexture(customFilm.image) } : undefined,
      };
      const bytes = new Blob([serializeMechitzaSelection(saved)], { type: "application/json" });
      const url = URL.createObjectURL(bytes);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = mechitzaSelectionFilename(saved);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Selection saved.");
    } catch {
      setError("The selection couldn’t be saved. Try again.");
    }
  }

  async function load(file: File) {
    setError("");
    setStatus("");
    try {
      if (file.size > MAX_SAVED_MECHITZA_BYTES) throw new Error("This file is too large to be a Mechitza selection.");
      const saved = parseMechitzaSelection(await file.text());
      const model = MECHITZA_MODELS.find((value) => value.id === saved.arrangement);
      const finish = MECHITZA_FINISHES.find((value) => value.id === saved.finish);
      const film = MECHITZA_FILMS.find((value) => value.id === saved.film);
      const art = findMechitzaArtColor(saved.art);
      if (!model || !finish || !film || !art) throw new Error("This selection uses an unavailable option.");

      let customFilm: SelectionFileState["customFilm"];
      if (saved.customFilm) {
        const data = Uint8Array.from(atob(saved.customFilm.data), (character) => character.charCodeAt(0));
        customFilm = { name: saved.customFilm.name, image: new Blob([data], { type: "image/jpeg" }) };
      }
      onLoad({ model, finish, film, art, people: saved.people, customFilm });
      setStatus("Selection loaded.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "This selection couldn’t be loaded.");
    }
  }

  return (
    <div className={styles.selectionFiles}>
      <div className={styles.selectionFileActions}>
        <button className={styles.secondaryButton} type="button" onClick={() => void save()}>
          <Download size={16} aria-hidden /> Save selection
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => input.current?.click()}>
          <Upload size={16} aria-hidden /> Load selection
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void load(file);
          }}
        />
      </div>
      {status && <p className={styles.filmUploadDetail} role="status">{status}</p>}
      {error && <p className={styles.colorError} role="alert">{error}</p>}
    </div>
  );
}
