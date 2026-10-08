/**
 * Tracks Catalog & Audio Codec Specifications
 * Used by Standard Mode and Scientific ABX Mode.
 */
(function() {
  const CODECS = {
    flac:      { name: 'FLAC',              service: 'Lossless Master', kbps: 700, label: '~700 kbps' },
    vorbis320: { name: 'Vorbis 320 kbps',   service: 'Spotify Premium', kbps: 320, label: '320 kbps' },
    aac256:    { name: 'AAC 256 kbps',      service: 'Apple Music',     kbps: 256, label: '256 kbps' },
    opus128:   { name: 'Opus 128 kbps',     service: 'YouTube Music',   kbps: 128, label: '128 kbps' },
    mp3128:    { name: 'MP3 128 kbps',      service: 'Standard MP3',    kbps: 128, label: '128 kbps' }
  };

  const KEYS = ['flac', 'vorbis320', 'aac256', 'opus128', 'mp3128'];

  const SONG_CATEGORIES = [
    {
      category: "Intimate Solo Vocal",
      contenders: [
        {
          id: 1,
          artist: "Adele",
          title: "All I Ask",
          cat: "Intimate Solo Vocal",
          hint: "Vocal sibilance, breath micro-details, and room reverb decay on piano.",
          cover: "covers/song1.jpg",
          files: {
            flac: "audio/song1_flac.flac",
            vorbis320: "audio/song1_vorbis320.ogg",
            aac256: "audio/song1_aac256.m4a",
            opus128: "audio/song1_opus128.opus",
            mp3128: "audio/song1_mp3128.mp3"
          }
        },
        {
          id: 9,
          artist: "Hozier",
          title: "Take Me to Church",
          cat: "Intimate Solo Vocal",
          hint: "Vocal dynamics, natural breathing, and ambient room reverberation on the backing choir.",
          cover: "covers/song9.jpg",
          files: {
            flac: "audio/song9_flac.flac",
            vorbis320: "audio/song9_vorbis320.ogg",
            aac256: "audio/song9_aac256.m4a",
            opus128: "audio/song9_opus128.opus",
            mp3128: "audio/song9_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Acoustic Grand Piano and Strings",
      contenders: [
        {
          id: 2,
          artist: "Teddy Swims",
          title: "Lose Control (Piano Version)",
          cat: "Acoustic Grand Piano and Strings",
          hint: "Piano hammer attack transients, soundboard resonance, and sustained decay.",
          cover: "covers/song2.jpg",
          files: {
            flac: "audio/song2_flac.flac",
            vorbis320: "audio/song2_vorbis320.ogg",
            aac256: "audio/song2_aac256.m4a",
            opus128: "audio/song2_opus128.opus",
            mp3128: "audio/song2_mp3128.mp3"
          }
        },
        {
          id: 10,
          artist: "Hozier",
          title: "Be (Acoustic)",
          cat: "Acoustic Grand Piano and Strings",
          hint: "Acoustic guitar pluck transients and warm natural room decay.",
          cover: "covers/song10.jpg",
          files: {
            flac: "audio/song10_flac.flac",
            vorbis320: "audio/song10_vorbis320.ogg",
            aac256: "audio/song10_aac256.m4a",
            opus128: "audio/song10_opus128.opus",
            mp3128: "audio/song10_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Complex Cymbals and Rock Drums",
      contenders: [
        {
          id: 3,
          artist: "Foo Fighters",
          title: "The Pretender",
          cat: "Complex Cymbals and Rock Drums",
          hint: "Ride cymbal sizzle, crash overtones, and sharp snare transient decay.",
          cover: "covers/song3.jpg",
          files: {
            flac: "audio/song3_flac.flac",
            vorbis320: "audio/song3_vorbis320.ogg",
            aac256: "audio/song3_aac256.m4a",
            opus128: "audio/song3_opus128.opus",
            mp3128: "audio/song3_mp3128.mp3"
          }
        },
        {
          id: 11,
          artist: "Queen",
          title: "Another One Bites the Dust",
          cat: "Complex Cymbals and Rock Drums",
          hint: "Crisp snare snap, hi-hat shimmer, and dry punchy bass transients.",
          cover: "covers/song11.jpg",
          files: {
            flac: "audio/song11_flac.flac",
            vorbis320: "audio/song11_vorbis320.ogg",
            aac256: "audio/song11_aac256.m4a",
            opus128: "audio/song11_opus128.opus",
            mp3128: "audio/song11_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "EDM Sub-Bass and Stereo Synths",
      contenders: [
        {
          id: 4,
          artist: "Zedd ft. Foxes",
          title: "Clarity",
          cat: "EDM Sub-Bass and Stereo Synths",
          hint: "Deep 40 Hz sub-bass drop, sidechain pumping, and wide stereo synth separation.",
          cover: "covers/song4.jpg",
          files: {
            flac: "audio/song4_flac.flac",
            vorbis320: "audio/song4_vorbis320.ogg",
            aac256: "audio/song4_aac256.m4a",
            opus128: "audio/song4_opus128.opus",
            mp3128: "audio/song4_mp3128.mp3"
          }
        },
        {
          id: 12,
          artist: "Alan Walker",
          title: "Faded",
          cat: "EDM Sub-Bass and Stereo Synths",
          hint: "35 Hz sub-bass drop, wide stereophonic synths, and vocal reverb tails.",
          cover: "covers/song12.jpg",
          files: {
            flac: "audio/song12_flac.flac",
            vorbis320: "audio/song12_vorbis320.ogg",
            aac256: "audio/song12_aac256.m4a",
            opus128: "audio/song12_opus128.opus",
            mp3128: "audio/song12_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Funk Groove and Sharp Horns",
      contenders: [
        {
          id: 5,
          artist: "Bruno Mars",
          title: "24K Magic",
          cat: "Funk Groove and Sharp Horns",
          hint: "Snappy slap bass transients, 80s drum machine crack, and bright horn fanfares.",
          cover: "covers/song5.jpg",
          files: {
            flac: "audio/song5_flac.flac",
            vorbis320: "audio/song5_vorbis320.ogg",
            aac256: "audio/song5_aac256.m4a",
            opus128: "audio/song5_opus128.opus",
            mp3128: "audio/song5_mp3128.mp3"
          }
        },
        {
          id: 13,
          artist: "Daft Punk",
          title: "Get Lucky",
          cat: "Funk Groove and Sharp Horns",
          hint: "Nile Rodgers funk guitar strum transients and punchy disco bassline.",
          cover: "covers/song13.jpg",
          files: {
            flac: "audio/song13_flac.flac",
            vorbis320: "audio/song13_vorbis320.ogg",
            aac256: "audio/song13_aac256.m4a",
            opus128: "audio/song13_opus128.opus",
            mp3128: "audio/song13_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Modern Polished Pop",
      contenders: [
        {
          id: 6,
          artist: "Dua Lipa",
          title: "Don't Start Now",
          cat: "Modern Polished Pop",
          hint: "Nu-disco bassline groove, crisp handclaps, and multi-tracked vocal layers.",
          cover: "covers/song6.jpg",
          files: {
            flac: "audio/song6_flac.flac",
            vorbis320: "audio/song6_vorbis320.ogg",
            aac256: "audio/song6_aac256.m4a",
            opus128: "audio/song6_opus128.opus",
            mp3128: "audio/song6_mp3128.mp3"
          }
        },
        {
          id: 14,
          artist: "Ariana Grande",
          title: "7 rings",
          cat: "Modern Polished Pop",
          hint: "Deep 808 sub-bass, rapid trap hi-hat rolls, and close-mic airy vocal harmonies.",
          cover: "covers/song14.jpg",
          files: {
            flac: "audio/song14_flac.flac",
            vorbis320: "audio/song14_vorbis320.ogg",
            aac256: "audio/song14_aac256.m4a",
            opus128: "audio/song14_opus128.opus",
            mp3128: "audio/song14_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Symphony Orchestra and Chimes",
      contenders: [
        {
          id: 7,
          artist: "John Williams",
          title: "Carol of the Bells",
          cat: "Symphony Orchestra and Chimes",
          hint: "High-frequency glockenspiel overtone decay and massed acoustic string sections.",
          cover: "covers/song7.jpg",
          files: {
            flac: "audio/song7_flac.flac",
            vorbis320: "audio/song7_vorbis320.ogg",
            aac256: "audio/song7_aac256.m4a",
            opus128: "audio/song7_opus128.opus",
            mp3128: "audio/song7_mp3128.mp3"
          }
        },
        {
          id: 15,
          artist: "Trans-Siberian Orchestra",
          title: "Christmas Eve / Sarajevo 12/24",
          cat: "Symphony Orchestra and Chimes",
          hint: "Glockenspiel bell harmonics colliding with electric guitars and orchestral strings.",
          cover: "covers/song15.jpg",
          files: {
            flac: "audio/song15_flac.flac",
            vorbis320: "audio/song15_vorbis320.ogg",
            aac256: "audio/song15_aac256.m4a",
            opus128: "audio/song15_opus128.opus",
            mp3128: "audio/song15_mp3128.mp3"
          }
        }
      ]
    },
    {
      category: "Hyper-Dense Fast J-Pop",
      contenders: [
        {
          id: 8,
          artist: "YOASOBI",
          title: "Adventure",
          cat: "Hyper-Dense Fast J-Pop",
          hint: "Dense wall of sound: rapid piano arpeggios, fast electronic kick, and vocal stacks.",
          cover: "covers/song8.jpg",
          files: {
            flac: "audio/song8_flac.flac",
            vorbis320: "audio/song8_vorbis320.ogg",
            aac256: "audio/song8_aac256.m4a",
            opus128: "audio/song8_opus128.opus",
            mp3128: "audio/song8_mp3128.mp3"
          }
        },
        {
          id: 16,
          artist: "Mrs. GREEN APPLE",
          title: "Soranji",
          cat: "Hyper-Dense Fast J-Pop",
          hint: "Dense wall of sound: soaring vocal vibrato over high-tempo orchestral rock arrangement.",
          cover: "covers/song16.jpg",
          files: {
            flac: "audio/song16_flac.flac",
            vorbis320: "audio/song16_vorbis320.ogg",
            aac256: "audio/song16_aac256.m4a",
            opus128: "audio/song16_opus128.opus",
            mp3128: "audio/song16_mp3128.mp3"
          }
        }
      ]
    }
  ];

  const TracksCatalog = { CODECS, KEYS, SONG_CATEGORIES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TracksCatalog;
  }
  if (typeof window !== 'undefined') {
    window.CODECS = CODECS;
    window.KEYS = KEYS;
    window.SONG_CATEGORIES = SONG_CATEGORIES;
    window.TracksCatalog = TracksCatalog;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.CODECS = CODECS;
    globalThis.KEYS = KEYS;
    globalThis.SONG_CATEGORIES = SONG_CATEGORIES;
    globalThis.TracksCatalog = TracksCatalog;
  }
})();
