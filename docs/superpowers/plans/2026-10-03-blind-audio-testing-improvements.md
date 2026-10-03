# Blind Audio Quality Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Blind Audio Quality Test web application to resolve synchronization bugs, add robust playback error handling, implement a 2-step pick workflow, introduce pre-test guidance and mobile banners, correct statistical and methodological claims, and optimize caching and accessibility.

**Architecture:** A lightweight, dependency-free HTML5 audio architecture. The app uses synchronized audio seeking across 4 blind audio elements per track, managed state for selection and confirmation, pre-test onboarding cards persisted in localStorage, and defensive event handling for play promises and network interruptions.

**Tech Stack:** Native HTML5 Audio, vanilla JavaScript (ES6+), responsive CSS3, and Cloudflare static asset headers.

**Spec:** External audit report addressing synchronization state (C5), playback error handling (C6), 4AFC methodology transparency, 2-step answer confirmation, statistical baselines, and mobile listening conditions.

## Global Constraints

* Strictly NO emojis in any code, UI text, or commit messages.
* Strictly NO em dashes (neither unicode \u2014 nor -- used as em dash) anywhere in code or user-facing copy.
* Self-contained client-side implementation with zero external runtime libraries or CDN scripts.
* All touch targets for interactive controls must be at least 44px by 44px.
* All commits must be made locally with Conventional Commit messages. Remote pushes require explicit user confirmation.

---

### Task 1: Methodological Transparency, Pre-Test Guidance, and Copy Correction

**Files:**
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `localStorage.getItem('blind_test_guide_dismissed')`
- Produces: Pre-test guide card, mobile touch notice banner, honest source attribution copy, neutralized track focus hints.

- [ ] **Step 1: Update title, header copy, and source attribution**

In `index.html`:
Change `<title>` from `Blind ABX Audio Quality Test` to `Blind Audio Quality Test`.
Update header badge from `NPR-STYLE BLIND ABX TEST` to `BLIND AUDIO QUALITY TEST`.
Add an attribution notice below the header subtitle:
`"Samples are encoded directly from identical lossless FLAC masters using bitrates comparable to popular streaming platforms. Not captured from live streaming feeds."`

- [ ] **Step 2: Add Pre-Test Guidance card with persistence**

In `index.html` above question list:
Render a clean guidance card:
- Title: "Before You Begin"
- Bullet points:
  - "Use wired headphones or studio monitors. Laptop speakers and Bluetooth headphones re-encode audio and can mask subtle details."
  - "Listen in a quiet environment at a comfortable, fixed volume."
  - "Disable EQ, spatial audio, bass boost, and audio enhancements."
  - "Compare the exact same musical section across samples using synchronized playback."
  - "Baseline expectation: with 4 options per track, pure random guessing averages 2 out of 8 (25% chance level)."
- Button: "Got It, Start Test" which collapses the card and executes `localStorage.setItem('blind_test_guide_dismissed', 'true')`.
- On page load, if `localStorage.getItem('blind_test_guide_dismissed') === 'true'`, render the card in a collapsed / minimal expandable state with an "Audio Setup Tips" link.

- [ ] **Step 3: Add touch device detection banner**

In `index.html`:
Check `window.matchMedia('(pointer: coarse)').matches` on initialization.
If true, display an alert banner below the header:
`"Listening on a mobile device? Phone speakers and Bluetooth earbuds recompress audio, making compression differences difficult to hear. For an accurate test, we recommend a computer with wired headphones."`

- [ ] **Step 4: Neutralize track challenge hints in track definitions**

In `index.html` (`SONG_CATEGORIES`):
Song 2: Replace `"Piano hammer attack transients & sustained resonance (lossy codecs often warble)."` with `"Piano hammer attack transients, soundboard resonance, and sustained decay."`
Song 3: Replace `"Ride cymbal sizzle & crash attacks (128k MP3 notoriously creates metallic swish)."` with `"Ride cymbal sizzle, crash overtones, and sharp snare transient decay."`
Song 10: Replace `&` with `and` in challenges to ensure consistent text formatting.
Song title quotes: Ensure clean ASCII double quotes `"${q.title}"` without character artifact symbols.

- [ ] **Step 5: Update README.md to match implementation**

In `README.md`:
Update technical features from "plain Web Audio APIs" to "HTML5 Audio with synchronized multi-track seeking".
Document the 4AFC test methodology and the 25% random guessing baseline.

- [ ] **Step 6: Verify and commit Task 1**

Run local server verification to confirm layout and text appearance.
Commit: `git commit -m "docs: improve test methodology transparency, add listening guidance, and neutralize hints"`

---

### Task 2: Audio Engine Synchronization and State Management (C5)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `<audio>` elements, `shuffledQuestions`, `currentPlaying`
- Produces: `syncTrackTime(qIdx, targetTime)`, `resetTrackState(qIdx)`, robust scrubbing across paused and active audio.

- [ ] **Step 1: Implement full synchronized seek function**

Create helper function `seekAllSamplesInQuestion(qIdx, targetTime)`:
```javascript
function seekAllSamplesInQuestion(qIdx, targetTime) {
  const q = shuffledQuestions[qIdx];
  if (!q) return;
  q.samples.forEach((_, sIdx) => {
    const audioEl = document.getElementById(`audio-${qIdx}-${sIdx}`);
    if (audioEl) {
      if (audioEl.readyState >= 1) {
        audioEl.currentTime = targetTime;
      } else {
        audioEl.addEventListener('loadedmetadata', () => {
          audioEl.currentTime = targetTime;
        }, { once: true });
      }
    }
  });
}
```

- [ ] **Step 2: Fix onScrub to synchronize all 4 audio elements even when paused**

Modify `onScrub(qIdx, sIdx, val)`:
Parse `targetTime = parseFloat(val)`.
When `isSync` is enabled:
- If an audio element is currently playing in this question, set `currentPlaying.audio.currentTime = targetTime`.
- Always call `seekAllSamplesInQuestion(qIdx, targetTime)` to guarantee the remaining 3 audio elements match the exact position.
- Update scrubber values and time indicators (`${formatTime(targetTime)} / ${formatTime(duration)}`) across all 4 sample rows in question `qIdx`.

- [ ] **Step 3: Fix onAudioEnded state reset**

Modify `onAudioEnded(qIdx, sIdx)`:
When audio reaches playback end (30s):
- Reset `currentPlaying = null`.
- Update the play button icon back to the play triangle for that row.
- Remove `.playing` class from the row.
- Reset `currentTime` to `0` across all 4 samples in question `qIdx`.
- Reset all 4 scrubbers in question `qIdx` back to `0`.
- Update all 4 time displays in question `qIdx` back to `0:00 / 0:30`.
- Ensure next play press starts cleanly from 0:00.

- [ ] **Step 4: Fix question switching clean transition**

Modify `togglePlay(qIdx, sIdx)`:
When switching playback from Question A to Question B:
- Stop previous question audio cleanly without leaving orphan playing state.
- For the newly selected question, read the synchronized question position or resume from where that question was previously positioned.

- [ ] **Step 5: Verify and commit Task 2**

Test scrubbing while paused, switching between samples mid-playback, and reaching audio end.
Commit: `git commit -m "fix(audio): synchronize seek state across paused tracks and handle audio end"`

---

### Task 3: Playback Error Handling, Loading State, and Metadata Preload (C6)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Audio DOM events (`error`, `waiting`, `canplay`, `playing`)
- Produces: Inline error notice on failed tracks, play button promise recovery, visual buffering indicator.

- [ ] **Step 1: Wrap play() in Promise catch handlers**

In `togglePlay(qIdx, sIdx)`:
Replace uncaught `audioEl.play()` with:
```javascript
const playPromise = audioEl.play();
if (playPromise !== undefined) {
  playPromise.then(() => {
    btnIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    row.classList.add("playing");
    row.classList.remove("buffering");
    currentPlaying = { qIdx, sIdx, audio: audioEl };
  }).catch(err => {
    console.warn("Audio playback interrupted or blocked:", err);
    btnIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    row.classList.remove("playing");
    row.classList.remove("buffering");
    currentPlaying = null;
  });
}
```

- [ ] **Step 2: Attach onerror listeners to audio elements**

In `renderQuestions()` during card generation:
Add inline error listener or attach event listeners to each `<audio>` element:
```javascript
audioEl.addEventListener("error", (e) => {
  console.error(`Error loading audio file for Q${qIdx + 1} Sample ${sIdx + 1}:`, e);
  const row = document.getElementById(`row-${qIdx}-${sIdx}`);
  const playBtn = document.getElementById(`btn-${qIdx}-${sIdx}`);
  if (row) {
    row.classList.add("audio-error");
    const label = row.querySelector(".sample-label-wrap");
    if (label && !row.querySelector(".error-pill")) {
      const pill = document.createElement("span");
      pill.className = "error-pill";
      pill.textContent = "Audio unavailable";
      label.appendChild(pill);
    }
  }
  if (playBtn) {
    playBtn.disabled = true;
    playBtn.setAttribute("title", "Audio file could not be loaded");
  }
});
```

- [ ] **Step 3: Add buffering indicators (waiting and canplay)**

Attach `waiting` and `canplay` listeners to each audio element:
When `waiting` fires: add `.buffering` class to row, animate button opacity.
When `canplay` or `playing` fires: remove `.buffering` class.

- [ ] **Step 4: Switch preload attribute to metadata**

Change `<audio preload="auto">` to `<audio preload="metadata">`.
This prevents browsers from downloading all 32 full FLAC audio files on initial page load, while still loading audio duration and headers required for seek synchronization.

- [ ] **Step 5: Verify and commit Task 3**

Verify with simulated network offline or bad URL to confirm graceful error handling without freezing the UI.
Commit: `git commit -m "fix(audio): add play promise error handling, audio error indicators, and metadata preloading"`

---

### Task 4: Two-Step Pick Interaction and Confirm Workflow

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: User click on sample rows
- Produces: `stagedPicks` dictionary, "Confirm Pick" button per question card, unmasking on confirmation.

- [ ] **Step 1: Introduce stagedPicks state**

In `index.html` script:
Define `let stagedPicks = {};` (maps `qIdx -> sIdx`).
When user clicks a sample row or pick button:
Call `selectCandidate(qIdx, sIdx)`:
- If `userPicks[qIdx]` already exists (already confirmed), do nothing.
- Record `stagedPicks[qIdx] = sIdx`.
- Highlight the chosen row with `.candidate-selected` styling (subtle primary border, selected radio circle).
- Remove `.candidate-selected` from other rows in this question card.
- Enable the "Confirm Pick" button for question `qIdx`.

- [ ] **Step 2: Add Confirm Pick button to question card footer**

In `renderQuestions()` template:
Add card action footer:
```html
<div class="card-footer" id="footer-${qIdx}">
  <div class="confirm-prompt" id="prompt-${qIdx}">Select the sample you believe is highest quality, then confirm.</div>
  <button class="btn-confirm" id="btn-confirm-${qIdx}" disabled onclick="confirmPick(${qIdx})">
    Confirm Pick
  </button>
</div>
```

- [ ] **Step 3: Implement confirmPick function**

Create `confirmPick(qIdx)`:
- Retrieve `sIdx = stagedPicks[qIdx]`.
- Save `userPicks[qIdx] = { key: q.samples[sIdx].key, sIdx: sIdx }`.
- Disable all pick boxes and hide the "Confirm Pick" button (replace with status indicator).
- Unmask format badges on all 4 rows.
- Style row `sIdx` as correct (if FLAC) or wrong (if lossy).
- Style the FLAC row as correct answer.
- Update header progress bar.
- Check if all 8 questions are answered.

- [ ] **Step 4: Transition to final results with delay / action button**

If `Object.keys(userPicks).length === shuffledQuestions.length`:
Instead of immediately scrolling down and obscuring the final question's answer:
- Display a prominent banner at the bottom of the page or in question 8 card:
  `"All 8 tracks completed! [View Final Results]"`
- Add an automatic smooth scroll delay of 1.5 seconds or let the user click the button to scroll to results.

- [ ] **Step 5: Verify and commit Task 4**

Test selecting different samples, changing selection before confirmation, confirming, and verifying answer reveals.
Commit: `git commit -m "feat(ui): implement two-step pick workflow with confirmation before answer reveal"`

---

### Task 5: Objective Results Framing, Diagnostic Statistics, and Reshuffle Safety

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `userPicks`, `shuffledQuestions`
- Produces: Positive result score headline, breakdown by chosen format, random guessing baseline note, reshuffle confirmation dialog.

- [ ] **Step 1: Update results score headline and copy**

In `showFinalResults()`:
Change score title to positive framing:
`document.getElementById("score-title").textContent = \`You correctly identified lossless in ${correct} of ${shuffledQuestions.length} tracks!\`;`
Change subtitle to include baseline:
`document.getElementById("score-subtitle").textContent = \`${correct} / 8 Correct (${Math.round((correct / 8) * 100)}% accuracy) - Baseline random chance is 2 / 8 (25%)\`;`

- [ ] **Step 2: Update breakdown cards heading and labels**

Update HTML in `#results-section`:
Change section heading to: `"Which Formats Sounded Best to You?"`
Change explanatory subtext to:
`"This breakdown shows which audio format you selected as highest quality across the 8 listening trials."`
Update card labels:
- `Lossless FLAC selected: N times`
- `Apple Music 256k AAC selected: N times`
- `YouTube Music 128k Opus selected: N times`
- `Standard 128k MP3 selected: N times`

- [ ] **Step 3: Add Reshuffle confirmation protection**

Modify `reshuffleTest(changeSongs)`:
If `Object.keys(userPicks).length > 0 && !testSubmitted`:
```javascript
const confirmReset = window.confirm("Reshuffling will reset your current progress and randomize the songs. Do you want to proceed?");
if (!confirmReset) return;
```
If user confirms (or test was already finished), proceed with clean reset.

- [ ] **Step 4: Verify and commit Task 5**

Complete an 8-question test run, verify result score cards, check reshuffle confirmation prompt.
Commit: `git commit -m "feat(results): improve score framing, clarify format pick breakdown, and add reshuffle confirmation"`

---

### Task 6: Accessibility (WCAG), CSS Hygiene, and Cloudflare Caching Headers

**Files:**
- Modify: `index.html`
- Create: `_headers`

**Interfaces:**
- Consumes: User interaction, browser HTTP client
- Produces: Accessible interactive elements, 44px touch targets, `:focus-visible` styling, Cloudflare edge cache headers.

- [ ] **Step 1: Implement 44px minimum touch targets and focus visibility**

In `index.html` CSS:
- Set `.play-btn`: `min-width: 44px; min-height: 44px;`
- Set `.npr-pick-box`: `min-width: 44px; min-height: 44px;`
- Set `.scrubber`: increase thumb touch area using pseudo-elements or wrapper padding.
- Add `:focus-visible`:
```css
button:focus-visible,
input[type="range"]:focus-visible,
input[type="checkbox"]:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Add aria-label and titles across all interactive controls**

In `index.html`:
- Add `aria-label="Play Sample N"` and `aria-label="Pause Sample N"` dynamically to play buttons.
- Add `aria-label="Select Sample N"` to pick buttons.
- Add `aria-label="Audio scrubber for Sample N"` to range inputs.
- Add `aria-label="Toggle synchronized playback"` to the sync switch.
- Add `aria-live="polite"` to status messages and progress indicators.

- [ ] **Step 3: Clean up redundant CSS and fix title template string**

In `index.html`:
- Remove duplicate `@keyframes fadeIn` block.
- Remove unused CSS variable `--opus192-color`.
- In `renderQuestions()` template: fix `song-title` quotes to clean `"${q.title}"`.
- Add `@media (prefers-reduced-motion: reduce)`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
- Optimize sticky header on small screens (`@media (max-width: 600px)`): reduce padding, collapse subtitle on scroll.

- [ ] **Step 4: Create Cloudflare _headers file for asset caching**

Create `_headers` in project root:
```
/audio/*
  Cache-Control: public, max-age=31536000, immutable
/covers/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 5: Verify and commit Task 6**

Inspect accessibility with keyboard tab navigation, test mobile responsive breakpoints, verify `_headers`.
Commit: `git commit -m "style: enhance accessibility, touch targets, CSS hygiene, and static caching headers"`

---

### Task 7: Comprehensive Local Verification and Review

**Files:**
- Verify: `index.html`, `README.md`, `_headers`

- [ ] **Step 1: Verify on local Python HTTP server**

Run local server on port 8080.
Check:
- Title and header badges render properly.
- Pre-test guide card appears and dismisses cleanly to localStorage.
- Playing audio, scrubbing while paused, and synchronous switching work smoothly.
- Two-step pick allows switching candidate before clicking Confirm Pick.
- Answers reveal with clear green checkmarks and red crosses.
- Reshuffle prompt protects active sessions.
- Results screen accurately computes correct answers and displays format breakdown.
- Zero emojis and zero em dashes across the entire codebase.

- [ ] **Step 2: Check git status and prompt user for review**

Verify `git status` is clean.
Present the completed improvements to the user and request approval before any remote push to GitHub.
