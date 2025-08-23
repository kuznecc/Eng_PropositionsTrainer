# Gemini Code Companion — Preposition Trainer

Use this as the single source of truth when generating or editing code for this project.

## 1) Purpose
Train English **verb + preposition** collocations in a browser.

## 2) Tech Stack & Structure
- **Modular app:** `index.html` + ES modules under `src/` and CSS in `styles/`.
- **React 18 (UMD)**, **ReactDOM (UMD)**, and **PapaParse** via **CDN**. No bundlers.
- **No other network calls** besides an optional `assets/dataset/*.csv` fetch.
- Key files:
    - `index.html` — entry HTML, loads CDNs, `styles/app.css`, and `src/app.js` (module).
    - `assets/dataset/dataset.csv` — prepositions dataset; `assets/dataset/dataset_irregular_verbs.csv` — future mode.
    - `assets/precondition_types.md` — reference text for preposition type tooltips.

## 3) Data Model (CSV)
Each row represents one training item.
- Required columns:
    - `verb` — the verb of the collocation.
    - `preposition` — the correct preposition (single token).
    - `usage_case` — a sentence with the preposition **removed** and replaced by a visible placeholder (e.g., `___`).
- Trim fields; ignore empty lines and comment lines starting with `#`.
- On CSV issues: **skip invalid rows**, continue with valid ones, and surface a **non-blocking warning**.

## 4) Dataset Loading
- Default: use a small **embedded fallback dataset** in code (see `src/modes/prepositions/fallback.js`).
- If `assets/dataset/dataset.csv` exists:
    - Fetch with `{ cache: 'no-store' }`.
    - Parse with PapaParse (header row expected).
    - If parsing succeeds and rows ≥ 1, **override** the fallback.

## 5) UI Rules
- **Sentence layout:** Show the *usage case* in **one line**: `before + [input] + after`. Layout uses DOM (`white-space: nowrap`). Horizontal scroll is acceptable if needed.
- **Input width** starts at **1ch** and expands with input length (monospace font).
- **Enter key** submits via a `<form onSubmit>` handler (no brittle keydown).
- **Focus** stays in the input after submit.
- **Keyboard only** use is fully supported (no mouse required).
- Minimal, readable styles. No frameworks.

## 6) Interaction Logic
- On submit:
    - If answer is **correct** → show a brief toast (“OK”), then **immediately advance** to a **different random** sentence.
    - If answer is **wrong** → show a brief toast (“Wrong: <correct>”), **repeat the same** sentence, **clear input**.
- **Toasts** auto-hide (~2s), never block input or navigation.

## 7) Randomization & Repetition
- Choose the next prompt **uniformly at random** from the filtered dataset.
- Avoid showing the **same item twice in a row** when advancing after a correct answer (see `src/hooks/useQueue.js`).
- Wrong answers **force a retry** on the same item.

## 8) Validation & Normalization
- Compare user input to `preposition`:
    - **Case-insensitive**, **trimmed**.
    - No punctuation allowed in the answer.
- Do **not** alter the dataset values beyond trimming.

## 9) Performance & Resilience
- No state heavier than the current item and small stats in memory.
- Handle empty or tiny datasets gracefully (fallback if needed).
- All failures degrade with clear, non-blocking notices.

## 10) Accessibility
- Proper labels for input and buttons.
- Live region for toast messages (polite).
- Sufficient contrast; focus outline visible.

## 11) Non-Goals
- No routing, auth, server code, TypeScript, Redux, or CSS frameworks.
- No persistent storage beyond the current session.

---
**When uncertain:** preserve Sections **5–7** behaviors first, then change code minimally.
