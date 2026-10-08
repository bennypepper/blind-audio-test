# Blind Audio Quality Test

Live Application: **[https://blind-audio-test.sharkintheatlantis.workers.dev/](https://blind-audio-test.sharkintheatlantis.workers.dev/)**

An acoustic evaluation and double-blind listening test web application. Compare real-world streaming formats against lossless CD FLAC masters across eight curated acoustic profiles.

---

## Overview

Can human listeners reliably distinguish between uncompressed CD masters and modern compressed streaming codecs? This project provides two evaluation protocols to test your playback equipment and listening acuity:

1. **Standard Mode (Rapid Multi-Tier Matrix)** — An NPR-style exploratory challenge where you identify the lossless master among mystery samples.
2. **Scientific ABX Mode (Double-Blind 2AFC)** — A formal, mathematically rigorous double-blind testing protocol based on ITU-R recommendations and inspired by [abx.digitalfeed.net](https://abx.digitalfeed.net).

---

## Testing Protocols

### 1. Standard Mode (Exploratory Streaming Challenge)
* **Goal**: Identify the lossless CD master among mystery options for each song.
* **Dynamic Stream Customizer**: By default, presents a balanced 3-stream test (**FLAC**, **Vorbis 320 kbps**, **Opus 128 kbps**) with a 33.3% random guess chance baseline (~2.7 out of 8). You can customize active streams on the fly to test any 2 to 5 formats simultaneously.
* **Synchronized Playback**: Seamlessly switch between sample options at the exact same playhead position without playback interruption.
* **Interactive Waveform Scrubber**: 96-bar generated waveform display with drag-and-drop, touch scrubbing, and keyboard seek controls.
* **Results Breakdown**: Displays your overall identification score against chance level, along with a tally breakdown of which lossy codecs your ears favored.

### 2. Scientific ABX Mode (Double-Blind 2AFC Protocol)
* **Goal**: Determine whether you can reliably distinguish a specific lossy codec from the lossless master beyond statistical chance.
* **Double-Blind 2-Alternative Forced Choice (2AFC)**: Null hypothesis ($H_0$) represents pure guessing at 50.0% probability.
* **Hardware CSPRNG Blinding**: Cryptographically secure pseudorandom number generation (`crypto.getRandomValues`) assigns target identity (`X is A` or `X is B`) in encapsulated memory that cannot be inspected via DOM or network requests.
* **Gapless Web Audio Engine**: Sample-accurate playhead synchronization with 10 ms micro-crossfade gain ramps to eliminate audible switching clicks or tells.
* **Pre-Registration Battery**: Select 5 or 8 acoustic stress genres and configure trial counts (5, 10, or 20 trials per track; 25 to 160 total trials).
* **Statistical Rigor**:
  * **Exact Binomial p-value**: Calculated using Lanczos log-gamma binomial coefficients.
  * **95% Clopper-Pearson Confidence Intervals**: Exact Clopper-Pearson intervals computed via regularized incomplete beta quantile inversion.
  * **Holm-Bonferroni Correction**: Step-down adjusted significance for per-track inferences to prevent family-wise error inflation across multiple comparisons.
  * **Response Bias Detection**: Tracks whether choices disproportionately skew toward A or B relative to actual random distribution.
* **Inter-Track Rest Intervals**: Optional 30-second auditory fatigue break between tracks to reset ear sensitivity.
* **Exportable Audit Trail**: Download full JSON audit logs for scientific verification or copy a Markdown summary for sharing.

---

## Evaluated Audio Formats

All test samples are transcoded directly from original 16-bit / 44.1 kHz Redbook CD FLAC masters:

| Codec | Bitrate | Typical Streaming Service | Technical Characteristics |
| :--- | :--- | :--- | :--- |
| **Lossless FLAC** | ~800–1000 kbps | Tidal / Apple Lossless / Qobuz | Bit-perfect reference master (16-bit / 44.1 kHz) |
| **Ogg Vorbis** | 320 kbps | Spotify Premium (Very High Quality) | Spotify's highest lossy tier using `libvorbis` |
| **AAC-LC** | 256 kbps | Apple Music / YouTube Music Premium | Modern perceptual AAC encoding with flat response |
| **Opus** | 128 kbps | YouTube / YouTube Music Free | Modern high-efficiency transform codec |
| **MP3 (LAME)** | 128 kbps | Legacy Web / Broadcast | Legacy perceptual codec with steep 16 kHz low-pass cutoff |

> Note: Audio files are generated offline from the same lossless source masters to ensure identical levels and timing. They are not recorded from streaming desktop apps.

---

## Curated Acoustic Profiles

The test battery includes eight diverse acoustic categories selected to evaluate distinct psychoacoustic stress characteristics:

1. **Intimate Solo Vocal**: Sparse acoustic arrangement focusing on vocal sibilance, breath micro-details, and room reverberation decay.
2. **Acoustic Grand Piano & Strings**: Steep percussive hammer attack transients, complex soundboard resonance, and sustained harmonic decay tails.
3. **Complex Cymbals & Rock Drums**: High-frequency metallic sheen, snare punch, and transient smearing under lossy transform boundaries.
4. **EDM Sub-Bass & Stereo Synths**: Deep sub-bass frequency extension, wide stereo phase coherence, and heavy dynamic limiter pumping.
5. **Funk Groove & Sharp Horns**: Fast brass attack transients, dynamic bass guitar articulation, and rhythmic micro-timing.
6. **Modern Polished Pop**: Heavily layered production, synthetic sub-bass weight, and crisp high-frequency air.
7. **Symphony Orchestra & Chimes**: Wide dynamic range, delicate orchestral percussion, bells, and complex multi-instrumental hall decay.
8. **Hyper-Dense Fast J-Pop**: Extremely high note density, multi-layer frequency masking, fast synth arpeggios, and compression stress.

---

## Keyboard Hotkeys

Both testing modes support complete keyboard navigation:

### Scientific ABX Mode
* `A` — Audition Source A
* `X` — Audition Source X
* `B` — Audition Source B
* `1` — Choose **X is A**
* `2` — Choose **X is B**
* `Enter` — Commit choice and advance to next trial
* `Space` — Toggle Play / Pause
* `←` / `→` — Seek backward / forward 5 seconds
* `Home` — Rewind playhead to start

### Standard Mode
* `1`–`5` — Audition mystery samples 1 through 5
* `Space` — Toggle Play / Pause
* `←` / `→` — Seek backward / forward 5 seconds
* `Home` — Rewind playhead to start

---

## Verification & Test Suite

The project includes an automated test suite with zero external runtime dependencies:

```bash
# Run statistical engine tests (exact binomial, Clopper-Pearson CI, Holm correction)
node tests/test-stats.js

# Run Web Audio gapless engine & fallback tests (playhead sync, CSPRNG, catalog assets)
node tests/test-audio.js

# Run end-to-end DOM, state machine, and UI integration tests
node tests/test-ui-integration.js
```

---

## Local Setup

Serve the files using any static HTTP server from the project directory:

```bash
# Python
python -m http.server 8080

# Or Node.js
npx serve .
```

Open `http://localhost:8080` in any modern web browser. Wired headphones and a quiet listening environment are recommended.
