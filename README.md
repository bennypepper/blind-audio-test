# Blind Audio Quality Test

An NPR-inspired double-blind ABX audio quality test web application. Compare real-world streaming tiers against lossless FLAC across diverse acoustic profiles.

## Overview

Can the human ear reliably tell the difference between uncompressed master audio and modern lossy codecs? This project puts your listening environment and ears to the test using level-matched 30-second snippets across eight distinct acoustic challenges.

### Evaluated Audio Formats

1. Lossless FLAC (Master quality bit-perfect audio)
2. Apple Music AAC 256 kbps (Industry standard high-bitrate AAC)
3. YouTube Music Opus 128 kbps (Modern high-efficiency streaming codec)
4. Standard MP3 128 kbps (Legacy baseline with high-frequency rolloff)

### Test Categories and Acoustic Profiles

* Intimate Solo Vocal: Adele (All I Ask) vs Hozier (Take Me to Church)
* Acoustic Grand Piano: Teddy Swims (Lose Control - Piano) vs Hozier (Be - Acoustic)
* Complex Cymbals and High Transients: Foo Fighters (The Pretender) vs Queen (Another One Bites the Dust)
* EDM Sub-Bass and Stereo Panning: Zedd ft. Foxes (Clarity) vs Alan Walker (Faded)
* Funk Groove and Brass Stabs: Bruno Mars (24K Magic) vs Daft Punk (Get Lucky)
* Modern High-Definition Pop: Dua Lipa (Don't Start Now) vs Ariana Grande (7 rings)
* Symphony Orchestra and Chimes: John Williams (Carol of the Bells) vs Trans-Siberian Orchestra (Christmas Eve / Sarajevo)
* Hyper-Dense Fast Transients: YOASOBI (Adventure) vs Mrs. GREEN APPLE (Soranji)

## Key Technical Features

* Instant Synchronous ABX Switching: Jump between blind sample variations seamlessly at the exact same playhead position without playback pausing or desync.
* Double-Blind Randomization: Audio slot positions (Sample 1 to 4) are randomized per question.
* Per-Track Reveal: Immediate visual confirmation and codec badges unmasked upon picking your choice.
* Dynamic Reshuffle: Swaps contender tracks and resets blind slot positions for replayability.
* Zero Dependencies: Plain HTML5, responsive CSS, and native Web Audio APIs.

## Local Setup

Run a local HTTP server from the project directory:

```bash
python -m http.server 8080
```

Open `http://localhost:8080` in your web browser.

## Cloudflare Pages Deployment

* Framework preset: None
* Build command: (leave empty)
* Build output directory: (leave empty or .)
