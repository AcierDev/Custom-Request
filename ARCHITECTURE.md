# Custom-Request — Architecture

A **Next.js 16 / React 19** web app for designing custom geometric wood art. Users pick a
size + design, customize a color palette, preview it in an interactive **React Three Fiber**
3D scene, share it via URL or saved set, and check out through **Shopify**. State lives in a
large **Zustand** store; persistence is **MongoDB**; auth is custom (Google / Facebook / email
magic-link).

---

## 1. High-level layers

```mermaid
graph TD
    subgraph client["🖥️ Client (Browser)"]
        UI["App Router Pages<br/>src/app/**"]
        COMP["React Components<br/>src/components/**"]
        R3F["3D Preview (R3F + three.js)<br/>src/components/preview/**"]
        STORE["Zustand Store<br/>customStore.ts + hoverStore"]
        AUTHCTX["Auth Context<br/>lib/auth-context.tsx"]
    end

    subgraph server["⚙️ Next.js Server (server.js custom)"]
        API["Route Handlers<br/>src/app/api/**"]
        LIB["Server libs<br/>mongodb · token · email · userDataService"]
    end

    subgraph external["☁️ External Services"]
        MONGO[("MongoDB")]
        SHOPIFY["Shopify Admin API<br/>(draft orders)"]
        GOOGLE["Google OAuth"]
        FB["Facebook OAuth"]
        ZEPTO["ZeptoMail (magic links)"]
    end

    UI --> COMP --> R3F
    UI --> STORE
    COMP --> STORE
    R3F --> STORE
    UI --> AUTHCTX
    STORE <-->|save / load| AUTHCTX
    AUTHCTX -->|fetch| API
    UI -->|fetch| API
    API --> LIB
    LIB --> MONGO
    API -->|OAuth| GOOGLE
    API -->|OAuth| FB
    API -->|create draft order| SHOPIFY
    LIB -->|send| ZEPTO
```

---

## 2. App Router page map

```mermaid
graph LR
    ROOT["layout.tsx<br/>AuthProvider · ThemeProvider · Navbar · MobileWarning"]

    ROOT --> HOME["/ page.tsx<br/>(landing)"]
    ROOT --> WELCOME["/welcome"]
    ROOT --> VIEWER["/viewer ⭐<br/>main designer"]
    ROOT --> DESIGN["/design<br/>PatternEditor"]
    ROOT --> DRAW["/draw-pattern"]
    ROOT --> PALETTE["/palette<br/>PaletteManager · PaletteList<br/>OfficialPalettes · ImageColorExtractor"]
    ROOT --> PAINTSEL["/paint-selector"]
    ROOT --> PROFILE["/profile"]
    ROOT --> SHARED["/shared/[id]<br/>read-only preview"]
    ROOT --> SHAREDSET["/shared-set/[setId]/breakdown"]
    ROOT --> ADMIN["/admin/palettes"]
    ROOT --> SIGNIN["/sign-in"]
    ROOT --> AUTHH["/auth/* handlers<br/>google · facebook · email/complete"]
    ROOT --> LEGAL["/(legal)<br/>privacy · terms"]
    ROOT --> ANIM["/animation-test"]

    VIEWER -.uses.-> GP["GeometricPattern (3D)"]
    SHARED -.uses.-> GP
    SHAREDSET -.uses.-> GP
```

---

## 3. State, persistence & sharing data flow

```mermaid
graph TD
    subgraph stores["Zustand stores (src/store/customStore.ts)"]
        CS["useCustomStore<br/>dimensions · selectedDesign · colorPattern<br/>customPalette · savedPalettes · paletteFolders<br/>draftSets · pricing · wood/lighting view state"]
        HS["useHoverStore / hoverStore<br/>transient hover state"]
    end

    CS -->|calculatePrice| PRICING["lib/pricing.ts"]
    CS -->|blend / ΔE| COLOR["lib/colorUtils.ts"]
    CS -->|paint-like mix| MIX["lib/paintMixSimulator.ts<br/>(spectral.js)"]
    MIX --> COLOR
    CS -->|colour maps| CMAP["typings/color-maps.ts<br/>DESIGN_COLORS"]
    CS -->|wood defaults| WOOD["preview/woodStyles.ts"]

    CS -->|encode / decode| URLU["lib/urlUtils.ts<br/>(lz-string compress)"]
    URLU -->|shareable link| LINK(["?state= / short URL"])

    CS <-->|save/loadUserData| AUTH["lib/auth-context.tsx"]
    AUTH -->|GET/POST /api/user-data| UDAPI["api/user-data"]
    UDAPI --> UDS["lib/userDataService.ts"]
    UDS --> MONGO[("MongoDB<br/>userData collection")]

    CS -.share design.-> SDAPI["api/shared-designs<br/>api/shared-design-sets"]
    SDAPI --> MONGO2[("MongoDB<br/>sharedDesigns · sharedDesignSets")]
    SHAREDPG["/shared/[id] · /shared-set/..."] -->|GET| SDAPI
```

---

## 4. 3D preview render pipeline (React Three Fiber)

```mermaid
graph TD
    VIEWER["/viewer page"] --> CANVAS["&lt;Canvas&gt; (R3F)"]
    CANVAS --> GP["GeometricPattern.tsx"]
    CANVAS --> ROOM["Room.tsx<br/>(models/room2.glb)"]
    CANVAS --> RULER["Ruler3D.tsx"]

    GP --> INST["InstancedSquares.tsx<br/>(instanced mesh, perf)"]
    GP --> PLY["PlywoodBase.tsx"]
    INST --> WS["woodStyles.ts<br/>WOOD_STYLE · METALLIC_PAINT"]

    subgraph alt["alt. tiled path"]
        TILED["TiledPattern.tsx"] --> SQ["Square.tsx"]
        TILED --> PLY
    end

    GP -.reads.-> PU["patternUtils.ts<br/>color layout / getColorEntries"]
    GP -.reads.-> CS2["useCustomStore"]
    INST -.reads.-> CS2

    subgraph lighting["Lighting"]
        LC["LightingControls.tsx"] --> LS["LightingSetups.tsx"]
        LS --> RL["RotatableLighting.tsx<br/>TimeOfDay"]
        ROOM --> RL
    end

    VC["ViewControls.tsx"] --> CANVAS
    CIH["ColorInfoHint.tsx"] -.hover.-> HS["hoverStore"]
    GEOM["GeometricPattern"] -.frame anim.-> AU["animationUtils.ts (frameAlpha)"]
    ROOM --> WALL["wallColors.ts"]
```

---

## 5. Auth & API routes

```mermaid
graph TD
    subgraph clientauth["Client"]
        AUTHCTX["auth-context.tsx<br/>signIn · signOut · saveUserData · loadUserData"]
    end

    AUTHCTX -->|google| GAPI["api/auth/google/callback"]
    AUTHCTX -->|facebook| FBAPI["api/auth/facebook/callback"]
    AUTHCTX -->|email link| EAPI["api/auth/email + /callback"]

    GAPI -->|exchange code| GOOGLE["oauth2.googleapis.com"]
    FBAPI -->|exchange code| FB["graph.facebook.com"]
    EAPI --> EMAIL["lib/email.ts (ZeptoMail)"]

    GAPI --> TOK["lib/token.ts"]
    FBAPI --> TOK
    EAPI --> TOK
    TOK --> MONGO[("MongoDB<br/>tokens (TTL index)")]

    subgraph dataapi["Data / commerce APIs"]
        UD["api/user-data"] --> UDS["userDataService.ts"] --> MONGO
        PAL["api/palettes/[id]"] --> MONGO
        APAL["api/admin/palettes<br/>(guarded by lib/admin.ts)"] --> MONGO
        SD["api/shared-designs"] --> MONGO
        SDS["api/shared-design-sets"] --> MONGO
        ORDER["api/create-draft-order"] --> SHOPIFY["Shopify Admin API"]
    end

    AUTHCTX --> UD
```

---

## 6. Paint & palette subsystem

```mermaid
graph LR
    subgraph importers["Build-time importers (scripts/paints/*.mjs)"]
        IMP["import-sherwin · behr · valspar · ppg · benjamin-moore"]
    end
    IMP --> PUB["public/paints/&lt;brand&gt;/*<br/>(brand color catalogs)"]

    PUB --> PAINTLIB["lib/paint.ts"]
    PALPAGE["/palette page"] --> PM["PaletteManager<br/>ColorSwatch · AddColorButton<br/>ColorHarmonyGenerator · BlendingGuide"]
    PALPAGE --> PL["PaletteList<br/>FolderSection · PaletteCard<br/>VersionHistoryDialog · ImportCard"]
    PALPAGE --> OP["OfficialPalettes"]
    PALPAGE --> ICE["ImageColorExtractor<br/>ImageUploader · ImageColorPicker"]

    PM --> CS["useCustomStore.customPalette"]
    PAINTLIB --> MIX["paintMixSimulator.ts (spectral.js)"]
    MIX --> COLOR["colorUtils.ts (ΔE2000, blend)"]
    OP --> APAL["api/admin/palettes"]
```

---

## Tech stack quick reference

| Concern | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + custom `server.js`, React 19, TypeScript |
| 3D | three.js, @react-three/fiber, @react-three/drei, @react-spring/three |
| State | Zustand (`customStore.ts`, `hoverStore`) |
| Styling/UI | Tailwind CSS, shadcn/ui (`components/ui/*`), Radix, framer-motion, lucide |
| Data | MongoDB (`userData`, `tokens`, `sharedDesigns`, `sharedDesignSets`) |
| Auth | Custom — Google + Facebook OAuth, email magic-link, token TTL in Mongo |
| Commerce | Shopify Admin API (draft orders) |
| Color science | spectral.js (Kubelka–Munk mix), ΔE2000 in `colorUtils.ts` |
| Sharing | `lz-string`-compressed URL state + Mongo-backed share links |
| Email | ZeptoMail |
```
