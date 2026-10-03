# Blind Audio Quality Test

> **Live Web App:** [https://blind-audio-test.sharkintheatlantis.workers.dev/](https://blind-audio-test.sharkintheatlantis.workers.dev/)

An NPR-inspired blind audio quality listening test web application. Compare real-world streaming tiers against lossless FLAC across eight diverse acoustic profiles.

## Overview

Can the human ear reliably tell the difference between uncompressed master audio and modern lossy codecs? This project evaluates human auditory perception across eight acoustic challenges using four-alternative forced choice listening trials.

With four choices per song, baseline random guessing expectation is approximately 2 out of 8 correct (25% chance level).

### Evaluated Audio Formats

1. Lossless FLAC (Bit-perfect master reference)
2. Apple Music AAC 256 kbps (Industry standard high-bitrate AAC)
3. YouTube Music Opus 128 kbps (Modern high-efficiency streaming codec)
4. Standard MP3 128 kbps (Legacy baseline with high-frequency rolloff)

Note: Samples are encoded directly from identical lossless FLAC masters using bitrates comparable to popular streaming platforms. They are not captured from live streaming feeds.

### Test Categories and Acoustic Profiles

* Intimate Solo Vocal: Adele (All I Ask) vs Hozier (Take Me to Church)
* Acoustic Grand Piano and Strings: Teddy Swims (Lose Control - Piano) vs Hozier (Be - Acoustic)
* Complex Cymbals and Rock Drums: Foo Fighters (The Pretender) vs Queen (Another One Bites the Dust)
* EDM Sub-Bass and Stereo Synths: Zedd ft. Foxes (Clarity) vs Alan Walker (Faded)
* Funk Groove and Sharp Horns: Bruno Mars (24K Magic) vs Daft Punk (Get Lucky)
* Modern Polished Pop: Dua Lipa (Don't Start Now) vs Ariana Grande (7 rings)
* Symphony Orchestra and Chimes: John Williams (Carol of the Bells) vs Trans-Siberian Orchestra (Christmas Eve / Sarajevo)
* Hyper-Dense Fast J-Pop: YOASOBI (Adventure) vs Mrs. GREEN APPLE (Soranji)

## Key Technical Features

* Accordion Player Design: Focused single-track view reduces cognitive fatigue while comparing samples.
* Synchronous Multi-Track Seeking: Switch between blind sample variations seamlessly at the exact same playhead position without desync.
* Two-Step Pick Workflow: Select a candidate sample first to review before confirming your choice.
* Responsive Waveform Scrubber: Interactive seeking via mouse drag, touch, or keyboard arrow keys.
* Reshuffle Safety: Confirmation dialog prevents accidental loss of active test progress.
* Zero Dependencies: Plain HTML5 Audio, responsive CSS3, and vanilla JavaScript.

## Local Setup

Run a local HTTP server from the project directory:

```bash
python -m http.server 8080
```

Open `http://localhost:8080` in your web browser.
