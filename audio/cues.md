# The Bell That Broke Itself (1859 Big Ben) - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.1 LU, max momentary -10.1 LUFS, max short-term -13.2 LUFS
- Stems: voice -15.1 LUFS, music -25.6 LUFS, sfx -27.4 LUFS (voice gain +1.46 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 2.56 dB, active (>0.1 dB) on 32.03 % of samples, >0.5 dB on 10.77 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.0 LUFS
  Loudness range:
    LRA:         2.1 LU
    Threshold: -35.0 LUFS
    LRA low:   -16.1 LUFS
    LRA high:  -14.0 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-5.57 | -15.1 | -25.0 | -26.1 | -23.0 | 7.9 | 8.0 | 3.5 |
| town (2) | 5.57-10.27 | -15.2 | -25.7 | -29.6 | -24.2 | 9.0 | 8.5 | 5.1 |
| hoist (3) | 10.27-15.23 | -15.0 | -25.0 | -29.7 | -23.7 | 8.7 | 8.5 | 3.5 |
| warning (4-5) | 15.23-22.10 | -14.7 | -24.7 | -36.3 | -24.4 | 9.7 | 9.7 | 4.1 |
| monster (6) | 22.10-26.37 | -14.6 | -24.9 | -28.2 | -23.2 | 8.7 | 9.2 | 2.8 |
| bridge (7) | 26.37-31.33 | -16.3 | -26.6 | -26.3 | -23.4 | 7.1 | 6.2 | 3.4 |
| crack (8) | 31.33-35.47 | -15.7 | -49.8 | -24.2 | -24.2 | 8.5 | 10.3 | 3.9 |
| silent (9-10) | 35.47-42.30 | -15.7 | - | -37.5 | -37.5 | 21.8 | 25.3 | 16.1 |
| spring (11) | 42.30-46.57 | -15.0 | -27.0 | -35.1 | -26.4 | 11.4 | 11.0 | 5.9 |
| glass (12) | 46.57-52.97 | -15.7 | -27.2 | -27.7 | -25.2 | 9.4 | 9.6 | 5.2 |
| payoff (13) | 52.97-56.50 | -15.0 | -24.0 | -28.0 | -22.5 | 7.5 | 6.8 | 2.1 |
| fix (14) | 56.50-63.10 | -13.6 | -26.6 | -28.1 | -24.7 | 11.1 | 14.0 | 5.9 |
| chime (15) | 63.10-67.50 | -15.8 | -27.0 | -24.4 | -22.5 | 6.7 | 5.9 | 2.6 |

## Music map (original march, Bb major, 120 bpm: quarter note = footfall)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): hook -9.5, town -10.5, march -10.0, bounce -10.0, whistle -9.5, tension -10.0, sway -12.0, swing -11.5, march2 -10.5, rule -11.5, tourists -11.0. Applied section gains (dB): hook -7.9, town -4.1, march -5.9, bounce -6.5, whistle -5.0, tension -10.3, sway -7.2, swing -6.9, march2 -3.1, rule -1.7, tourists -7.8, dropout -10.3.

Rides (music only, dB): 4.40-5.45 s -3.0, 25.20-26.25 s -2.0, 30.40-31.15 s -4.0, 61.80-62.95 s -3.0 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. The hook's last two footfalls (3.5, 4.0) are also 3 dB lower in the SFX for '...walking across it.'

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | hook: theme A1-A3 tutti, 7 whistlers, tuba/after-beats/snare; snare fill 4.2-5.5 under 'wanted it louder.' |
| 5.57 | 167 | Bb button + light clash exactly on the white flash (frame 167), then the band resets |
| 6.00 | 180 | story: theme A1-A2 light (glock + fife, tuba on 1/3, horns on 2/4, light snare) |
| 10.00 | 300 | full band: theme A3-A8 as workers haul the 13-ton bronze giant |
| 16.00 | 480 | tuba switches to bouncing octaves as the makers warn Denison |
| 22.25 | 668 | whistling motif as Denison rigs the monster iron hammer |
| 29.50 | 885 | tension: F7 pedal, chromatic climb, snare roll crescendo |
| 31.32 | 940 | DEAD STOP on 'Then,' - music silent through the 4-foot crack and the 'Luckily / Unluckily' deadpan joke |
| 42.30 | 1269 | warm golden return: pad Bb - Eb/Bb - Bb - F7, soft low brass, vibes on the bronze spring flex |
| 46.60 | 1398 | music-box waltz accompanying the crystal drinking glass & spoon analogy |
| 53.00 | 1590 | golden belfry payoff: soft brass and whistlers |
| 58.60 | 1758 | snare roll under the quarter-turn rotation into brass stabs on the 3 square-notch chisel blows |
| 62.50 | 1875 | warm Westminster Quarters motif + swung vibraphone finale under 'that very same broken bell' |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -15.1 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb_day (bed, integrated) | Westminster daytime air: Thames breeze, river below, sparrows, tower flags (shots 1-8) | -30 | -30.0 | -45.1 | +0.00 |
| 2 | 0.933 | 28.0 | whoosh_cam | camera push-in on cracked bell | -12 | -18.0 | -33.1 | +0.00 |
| 3 | 1.220 | 36.6 | monster_swish | 700-lb monster hammer wind-up swish #1 | -14 | -20.0 | -35.1 | -0.25 |
| 4 | 1.320 | 39.6 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #1 (cracked) | -2 | -8.0 | -23.1 | -0.15 |
| 5 | 1.320 | 39.6 | hook_crack | hook flash-forward: bronze crack snap on 'cracked wide open' | -2 | -8.0 | -23.1 | -0.20 |
| 6 | 3.500 | 105.0 | whoosh_cam | camera push-in on Denison | -12 | -18.0 | -33.1 | +0.00 |
| 7 | 4.680 | 140.4 | monster_swish | 700-lb monster hammer wind-up swish #2 | -14 | -20.0 | -35.1 | -0.25 |
| 8 | 4.780 | 143.4 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #2 (intact) | -4 | -10.0 | -25.1 | -0.15 |
| 9 | 5.567 | 167.0 | crowd_murmur | Londoners on Westminster Bridge & quays (shot 2) | -10 | -16.0 | -31.3 | +0.00 |
| 10 | 5.567 | 167.0 | flash_whoosh | reverse swell into white flash (frame 167) + low boom | -5 | -11.0 | -26.1 | +0.00 |
| 11 | 8.550 | 256.5 | crowd_cheer | Londoners cheer on 'crowning it with its pride and joy' | -6 | -12.0 | -27.3 | +0.00 |
| 12 | 10.267 | 308.0 | whoosh_cam | camera cut to tower base hoist | -12 | -18.0 | -33.1 | +0.00 |
| 13 | 10.350 | 310.5 | rope_haul | heavy hemp ropes & timber pulley groaning under 13.5-ton Great Bell (shot 3) | -7 | -13.0 | -28.1 | -0.20 |
| 14 | 10.500 | 315.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -23.6 | -38.8 | +0.00 |
| 15 | 11.000 | 330.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -23.6 | -38.8 | +0.00 |
| 16 | 11.500 | 345.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -23.5 | -38.7 | +0.00 |
| 17 | 12.000 | 360.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -22.2 | -37.4 | +0.00 |
| 18 | 12.500 | 375.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.9 | -37.0 | +0.00 |
| 19 | 13.000 | 390.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.8 | -37.0 | +0.00 |
| 20 | 13.500 | 405.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.7 | -36.9 | +0.00 |
| 21 | 14.000 | 420.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.6 | -36.9 | +0.00 |
| 22 | 14.500 | 435.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.6 | -36.8 | +0.00 |
| 23 | 15.000 | 450.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 3) | -11 | -21.5 | -36.7 | +0.00 |
| 24 | 15.233 | 457.0 | whoosh_cam | camera cut to Foundry Master warning | -12 | -18.0 | -33.1 | +0.00 |
| 25 | 17.000 | 510.0 | whoosh_cam | camera punch in on gentle hammer | -12 | -18.0 | -33.1 | +0.00 |
| 26 | 17.650 | 529.5 | gentle_tap | Foundry Master demonstrates a gentle hammer tap on 'needs a gentle hammer' | -9 | -15.0 | -30.1 | -0.20 |
| 27 | 18.500 | 555.0 | whoosh_cam | camera cut to stubborn Edmund Denison | -12 | -18.0 | -33.1 | +0.00 |
| 28 | 22.100 | 663.0 | whoosh_cam | camera cut to monster iron hammer | -12 | -18.0 | -33.1 | +0.00 |
| 29 | 22.300 | 669.0 | winch_ratchet | heavy iron winch ratcheting the monster 700-lb hammer (shot 6) | -8 | -14.0 | -29.1 | -0.30 |
| 30 | 22.500 | 675.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -17.3 | -32.5 | +0.00 |
| 31 | 23.000 | 690.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -17.3 | -32.4 | +0.00 |
| 32 | 23.500 | 705.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -17.2 | -32.4 | +0.00 |
| 33 | 24.000 | 720.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -17.1 | -32.3 | +0.00 |
| 34 | 24.167 | 725.0 | whoosh_cam | camera wide hammer swing | -12 | -18.0 | -33.1 | +0.00 |
| 35 | 24.500 | 735.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -19.2 | -34.4 | +0.00 |
| 36 | 25.000 | 750.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -19.1 | -34.3 | +0.00 |
| 37 | 25.500 | 765.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -19.1 | -34.3 | +0.00 |
| 38 | 25.700 | 771.0 | monster_swish | 700-lb monster hammer wind-up swish #3 | -14 | -20.0 | -35.1 | -0.25 |
| 39 | 25.800 | 774.0 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #3 (intact) | -2 | -8.0 | -23.1 | -0.15 |
| 40 | 26.000 | 780.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 6) | -11 | -19.0 | -34.2 | +0.00 |
| 41 | 26.367 | 791.0 | whoosh_cam | camera cut to Westminster Bridge crowd | -12 | -18.0 | -33.1 | +0.00 |
| 42 | 26.500 | 795.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -22.4 | -37.6 | +0.00 |
| 43 | 27.000 | 810.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -22.4 | -37.6 | +0.00 |
| 44 | 27.500 | 825.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -22.3 | -37.5 | +0.00 |
| 45 | 27.680 | 830.4 | monster_swish | 700-lb monster hammer wind-up swish #4 | -14 | -20.0 | -35.1 | -0.25 |
| 46 | 27.780 | 833.4 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #4 (intact) | -4 | -10.0 | -25.1 | -0.15 |
| 47 | 27.850 | 835.5 | hat_rattle | top hats rattling & popping on Westminster Bridge from the shockwave | -11 | -17.0 | -32.1 | +0.00 |
| 48 | 28.000 | 840.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -22.3 | -37.5 | +0.00 |
| 49 | 28.500 | 855.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -19.4 | -34.5 | +0.00 |
| 50 | 28.540 | 856.2 | hat_rattle | top hats rattling & popping on Westminster Bridge from the shockwave | -11 | -17.0 | -32.1 | +0.00 |
| 51 | 29.000 | 870.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -19.3 | -34.5 | +0.00 |
| 52 | 29.400 | 882.0 | monster_swish | 700-lb monster hammer wind-up swish #5 | -14 | -20.0 | -35.1 | -0.25 |
| 53 | 29.500 | 885.0 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #5 (intact) | -4 | -10.0 | -25.1 | -0.15 |
| 54 | 29.500 | 885.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -19.2 | -34.4 | +0.00 |
| 55 | 29.550 | 886.5 | hat_rattle | top hats rattling & popping on Westminster Bridge from the shockwave | -11 | -17.0 | -32.1 | +0.00 |
| 56 | 30.000 | 900.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -17.8 | -32.9 | +0.00 |
| 57 | 30.250 | 907.5 | bridge_cheer | crowd on Westminster Bridge cheers on 'while the crowd cheers' | -6 | -12.0 | -27.3 | +0.00 |
| 58 | 30.500 | 915.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -17.6 | -32.8 | +0.00 |
| 59 | 31.000 | 930.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 7) | -11 | -17.5 | -32.7 | +0.00 |
| 60 | 31.333 | 940.0 | whoosh_cam | camera push in to Great Bell sound-bow | -12 | -18.0 | -33.1 | +0.00 |
| 61 | 31.500 | 945.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 8) | -11 | -16.1 | -31.3 | +0.00 |
| 62 | 32.000 | 960.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 8) | -11 | -16.1 | -31.3 | +0.00 |
| 63 | 32.100 | 963.0 | bronze_strain | bronze bell wall micro-stress groan 1/4 before SNAP | -11 | -17.0 | -32.1 | -0.15 |
| 64 | 32.500 | 975.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 8) | -11 | -16.1 | -31.2 | +0.00 |
| 65 | 32.550 | 976.5 | bronze_strain | bronze bell wall micro-stress groan 2/4 before SNAP | -10 | -16.0 | -31.1 | -0.15 |
| 66 | 33.000 | 990.0 | bronze_strain | bronze bell wall micro-stress groan 3/4 before SNAP | -9 | -15.0 | -30.1 | -0.15 |
| 67 | 33.000 | 990.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 8) | -11 | -16.1 | -31.3 | +0.00 |
| 68 | 33.350 | 1000.5 | bronze_strain | bronze bell wall micro-stress groan 4/4 before SNAP | -8 | -14.0 | -29.1 | -0.15 |
| 69 | 33.480 | 1004.4 | monster_swish | 700-lb monster hammer wind-up swish #6 | -14 | -20.0 | -35.1 | -0.25 |
| 70 | 33.500 | 1005.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 8) | -11 | -16.1 | -31.2 | +0.00 |
| 71 | 33.580 | 1007.4 | bell_crack_snap | FOUR-FOOT CRACK RIPS UP BIG BEN: catastrophic bronze shear + detuned ring + flying shards | +0 | -6.0 | -21.1 | -0.15 |
| 72 | 33.580 | 1007.4 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #6 (cracked) | -2 | -8.0 | -23.1 | -0.15 |
| 73 | 33.640 | 1009.2 | crack_rip_tear | 4-foot metallic fissure ripping up the bronze waist ('rips up its side') | -3 | -9.0 | -24.1 | -0.25 |
| 74 | 34.330 | 1029.9 | shard_land | bronze shard clinks on the belfry stone floor | -14 | -20.0 | -35.1 | -0.40 |
| 75 | 34.500 | 1035.0 | shard_land | bronze shard clinks on the belfry stone floor | -14 | -20.0 | -35.1 | +0.15 |
| 76 | 35.400 | 1062.0 | amb_belfry_silent (bed, integrated) | high belfry silence & wind after Big Ben cracks (shots 9-10) | -28 | -28.0 | -43.1 | +0.00 |
| 77 | 35.550 | 1066.5 | yoke_settle | 13-ton bell settles on its oak timber yoke without crashing through the floor | -10 | -16.0 | -31.1 | +0.00 |
| 78 | 39.450 | 1183.5 | dead_silent_dud | pathetic dull clink-buzz from the cracked bell + disappointed sigh ('goes dead silent') | -8 | -14.0 | -29.1 | +0.00 |
| 79 | 41.100 | 1233.0 | groans | Denison & Foundry Master groan in dismay ('nobody knows how to get it out') | -12 | -18.0 | -33.5 | +0.00 |
| 80 | 42.200 | 1266.0 | amb_golden (bed, integrated) | golden-hour calm: soft breeze, blackbird phrases, distant Thames (shots 11-13) | -29 | -29.0 | -44.1 | +0.00 |
| 81 | 42.300 | 1269.0 | whoosh_xfade | crossfade to golden-hour bronze physics | -12 | -18.0 | -33.1 | +0.00 |
| 82 | 43.000 | 1290.0 | spring_flex | bronze bell rim flexing in and out like a stiff spring | -12 | -18.0 | -33.1 | -0.20 |
| 83 | 43.680 | 1310.4 | spring_flex | bronze bell rim flexing in and out like a stiff spring | -12 | -18.0 | -33.1 | +0.20 |
| 84 | 44.360 | 1330.8 | spring_flex | bronze bell rim flexing in and out like a stiff spring | -12 | -18.0 | -33.1 | -0.20 |
| 85 | 45.040 | 1351.2 | spring_flex | bronze bell rim flexing in and out like a stiff spring | -12 | -18.0 | -33.1 | +0.20 |
| 86 | 45.720 | 1371.6 | spring_flex | bronze bell rim flexing in and out like a stiff spring | -12 | -18.0 | -33.1 | -0.20 |
| 87 | 46.567 | 1397.0 | whoosh_xfade | crossfade to park table analogy | -12 | -18.0 | -33.1 | +0.00 |
| 88 | 47.850 | 1435.5 | spoon_glass_tap | silver spoon gently taps crystal drinking glass #1 -> pure singing hum | -5 | -11.0 | -26.1 | -0.10 |
| 89 | 49.200 | 1476.0 | spoon_glass_tap | silver spoon gently taps crystal drinking glass #2 -> pure singing hum | -5 | -11.0 | -26.1 | -0.10 |
| 90 | 50.590 | 1517.7 | ladle_swish | heavy iron soup ladle swings down ('Slam it with a heavy ladle') | -13 | -19.0 | -34.1 | -0.20 |
| 91 | 50.690 | 1520.7 | ladle_slam | heavy iron soup ladle slams the drinking glass rim | -2 | -8.0 | -23.1 | -0.10 |
| 92 | 51.560 | 1546.8 | glass_split | crystal drinking glass rim splits right up ('and the rim splits right up') | -2 | -8.0 | -23.1 | +0.00 |
| 93 | 52.967 | 1589.0 | whoosh_xfade | crossfade back to golden belfry | -12 | -18.0 | -33.1 | +0.00 |
| 94 | 53.000 | 1590.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -17.9 | -33.1 | +0.00 |
| 95 | 53.500 | 1605.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -17.9 | -33.1 | +0.00 |
| 96 | 54.000 | 1620.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -17.9 | -33.1 | +0.00 |
| 97 | 54.500 | 1635.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -17.9 | -33.1 | +0.00 |
| 98 | 54.500 | 1635.0 | whoosh_cam | camera punch in on monster hammer payoff | -12 | -18.0 | -33.1 | +0.00 |
| 99 | 54.730 | 1641.9 | monster_swish | 700-lb monster hammer wind-up swish #7 | -14 | -20.0 | -35.1 | -0.25 |
| 100 | 54.830 | 1644.9 | big_ben_toll | 13.5-ton Great Bell struck by monster iron hammer #7 (cracked) | -4 | -10.0 | -25.1 | -0.15 |
| 101 | 55.000 | 1650.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -15.9 | -31.1 | +0.00 |
| 102 | 55.500 | 1665.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -15.9 | -31.1 | +0.00 |
| 103 | 56.000 | 1680.0 | hoist_pulse | rhythmic hoist / clockwork pulse (shot 13) | -11 | -15.9 | -31.1 | +0.00 |
| 104 | 56.400 | 1692.0 | amb_fix (bed, integrated) | belfry workshop daylight air: breeze, distant river (shot 14) | -28 | -28.0 | -43.1 | +0.00 |
| 105 | 56.500 | 1695.0 | whoosh_xfade | crossfade to daylight repair | -12 | -18.0 | -33.1 | +0.00 |
| 106 | 58.550 | 1756.5 | quarter_turn_winch | workers turn the 13.5-ton bell a quarter circle on its oak yoke | -7 | -13.0 | -28.1 | +0.00 |
| 107 | 59.833 | 1795.0 | whoosh_cam | camera cut to square notch chiseling | -12 | -18.0 | -33.1 | +0.00 |
| 108 | 60.710 | 1821.3 | chisel_swish | hammer swing for square notch | -20 | -26.0 | -41.1 | -0.15 |
| 109 | 60.800 | 1824.0 | chisel_notch | chisel & hammer blow 1/3 chipping the square anti-crack notch in bronze | -5 | -11.0 | -26.1 | -0.15 |
| 110 | 61.130 | 1833.9 | chisel_swish | hammer swing for square notch | -20 | -26.0 | -41.1 | -0.15 |
| 111 | 61.220 | 1836.6 | chisel_notch | chisel & hammer blow 2/3 chipping the square anti-crack notch in bronze | -4 | -10.0 | -25.1 | -0.15 |
| 112 | 61.560 | 1846.8 | chisel_swish | hammer swing for square notch | -20 | -26.0 | -41.1 | -0.15 |
| 113 | 61.650 | 1849.5 | chisel_notch | chisel & hammer blow 3/3 chipping the square anti-crack notch in bronze | -5 | -11.0 | -26.1 | -0.15 |
| 114 | 62.150 | 1864.5 | lighter_hammer_rig | sleek lighter hammer clicks & swings into position ('and hung a lighter hammer') | -9 | -15.0 | -30.1 | -0.20 |
| 115 | 63.000 | 1890.0 | amb_town (bed, integrated) | Westminster Bridge day air: breeze, sparrows, flags, river (shot 15) | -29 | -29.0 | -44.1 | +0.00 |
| 116 | 63.119 | 1893.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.3 | -40.6 | -0.37 |
| 117 | 63.150 | 1894.5 | town_murmur | Londoners chatting along Westminster Bridge & Thames embankments (shot 15) | -11 | -17.0 | -32.3 | +0.00 |
| 118 | 63.260 | 1897.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.6 | -41.0 | -0.47 |
| 119 | 63.286 | 1898.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.9 | -41.3 | -0.20 |
| 120 | 63.348 | 1900.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.4 | -0.30 |
| 121 | 63.406 | 1902.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.1 | -39.6 | -0.26 |
| 122 | 63.455 | 1903.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.9 | -40.2 | -0.37 |
| 123 | 63.522 | 1905.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.6 | -0.21 |
| 124 | 63.615 | 1908.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.2 | -38.5 | -0.39 |
| 125 | 63.691 | 1910.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.0 | -39.3 | -0.14 |
| 126 | 63.711 | 1911.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.9 | -39.3 | -0.50 |
| 127 | 63.720 | 1911.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.1 | -39.5 | -0.16 |
| 128 | 63.735 | 1912.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.0 | -40.4 | -0.12 |
| 129 | 63.736 | 1912.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.5 | -39.9 | -0.18 |
| 130 | 63.749 | 1912.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.5 | -38.9 | -0.38 |
| 131 | 63.802 | 1914.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.6 | -38.8 | -0.09 |
| 132 | 63.804 | 1914.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.6 | -41.0 | -0.23 |
| 133 | 63.812 | 1914.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.7 | -40.2 | -0.11 |
| 134 | 63.869 | 1916.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.7 | -41.1 | -0.17 |
| 135 | 63.879 | 1916.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.5 | -38.9 | -0.22 |
| 136 | 63.883 | 1916.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.6 | -38.9 | -0.24 |
| 137 | 63.910 | 1917.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.4 | -40.7 | -0.36 |
| 138 | 63.986 | 1919.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.2 | -39.5 | -0.37 |
| 139 | 64.048 | 1921.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.9 | -39.2 | -0.18 |
| 140 | 64.069 | 1922.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.4 | -39.8 | -0.30 |
| 141 | 64.291 | 1928.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.7 | -39.0 | -0.46 |
| 142 | 64.315 | 1929.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.8 | -41.2 | -0.20 |
| 143 | 64.333 | 1930.0 | whoosh_cam | camera cut to Westminster Bridge strollers | -12 | -18.0 | -33.1 | +0.00 |
| 144 | 64.375 | 1931.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.7 | -39.0 | +0.19 |
| 145 | 64.384 | 1931.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.9 | -41.3 | +0.05 |
| 146 | 64.408 | 1932.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.4 | -38.7 | +0.06 |
| 147 | 64.475 | 1934.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.3 | -38.7 | +0.10 |
| 148 | 64.498 | 1934.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.2 | -38.6 | -0.01 |
| 149 | 64.524 | 1935.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.0 | -39.4 | +0.26 |
| 150 | 64.534 | 1936.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -21.6 | -36.8 | +0.25 |
| 151 | 64.537 | 1936.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -22.9 | -38.1 | +0.48 |
| 152 | 64.550 | 1936.5 | big_ben_chime | famous E-natural chime of the rotated, square-notched broken Great Bell #1 | -3 | -9.0 | -24.1 | +0.00 |
| 153 | 64.570 | 1937.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -22.6 | -37.8 | +0.10 |
| 154 | 64.690 | 1940.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.5 | -38.8 | +0.26 |
| 155 | 64.696 | 1940.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -22.5 | -37.7 | +0.47 |
| 156 | 64.701 | 1941.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.7 | -39.0 | +0.07 |
| 157 | 64.705 | 1941.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.1 | -39.4 | +0.39 |
| 158 | 64.743 | 1942.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.9 | -41.2 | -0.03 |
| 159 | 64.763 | 1942.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.6 | -40.8 | +0.11 |
| 160 | 64.769 | 1943.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.4 | -40.7 | +0.20 |
| 161 | 64.790 | 1943.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.4 | +0.09 |
| 162 | 64.930 | 1947.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.3 | -40.7 | +0.01 |
| 163 | 65.109 | 1953.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.9 | -41.2 | +0.19 |
| 164 | 65.125 | 1953.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.3 | -39.6 | +0.15 |
| 165 | 65.201 | 1956.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.7 | -41.2 | +0.06 |
| 166 | 65.272 | 1958.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.0 | -38.2 | +0.51 |
| 167 | 65.284 | 1958.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.3 | -39.6 | -0.01 |
| 168 | 65.313 | 1959.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.4 | -39.7 | +0.26 |
| 169 | 65.313 | 1959.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.4 | +0.05 |
| 170 | 65.321 | 1959.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -18.7 | -33.9 | +0.33 |
| 171 | 65.322 | 1959.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.5 | -40.8 | +0.03 |
| 172 | 65.333 | 1960.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -22.7 | -38.0 | +0.27 |
| 173 | 65.333 | 1960.0 | whoosh_cam | camera final crane pullback over Thames | -12 | -18.0 | -33.1 | +0.00 |
| 174 | 65.336 | 1960.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -22.2 | -37.4 | +0.13 |
| 175 | 65.464 | 1963.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.7 | -40.1 | +0.38 |
| 176 | 65.492 | 1964.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.1 | -40.4 | +0.25 |
| 177 | 65.511 | 1965.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.7 | +0.31 |
| 178 | 65.544 | 1966.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.8 | -39.2 | +0.37 |
| 179 | 65.599 | 1968.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.9 | -39.3 | +0.55 |
| 180 | 65.643 | 1969.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.9 | -41.4 | +0.45 |
| 181 | 65.660 | 1969.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.6 | -38.9 | +0.50 |
| 182 | 65.670 | 1970.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.2 | -39.7 | +0.41 |
| 183 | 65.701 | 1971.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.3 | -39.8 | +0.61 |
| 184 | 65.736 | 1972.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.1 | -38.5 | +0.35 |
| 185 | 65.875 | 1976.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.5 | -41.1 | +0.38 |
| 186 | 65.903 | 1977.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.8 | -41.2 | +0.47 |
| 187 | 65.993 | 1979.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.7 | -40.2 | +0.37 |
| 188 | 66.007 | 1980.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.6 | -39.0 | +0.62 |
| 189 | 66.070 | 1982.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.3 | -40.0 | +0.34 |
| 190 | 66.102 | 1983.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.2 | -40.8 | +0.55 |
| 191 | 66.102 | 1983.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.5 | -40.9 | +0.50 |
| 192 | 66.131 | 1983.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.5 | -39.9 | +0.57 |
| 193 | 66.200 | 1986.0 | big_ben_chime | famous E-natural chime of the rotated, square-notched broken Great Bell #2 | -3 | -9.0 | -24.1 | +0.00 |
| 194 | 66.232 | 1986.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.9 | -39.4 | +0.44 |
| 195 | 66.242 | 1987.3 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.9 | -40.5 | +0.40 |
| 196 | 66.283 | 1988.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.3 | -38.7 | +0.40 |
| 197 | 66.352 | 1990.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.8 | -39.3 | +0.36 |
| 198 | 66.371 | 1991.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.2 | -38.7 | +0.49 |
| 199 | 66.493 | 1994.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.5 | -41.1 | +0.59 |
| 200 | 66.523 | 1995.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.5 | -41.0 | +0.51 |
| 201 | 66.554 | 1996.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.5 | -40.1 | +0.52 |
| 202 | 66.570 | 1997.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.5 | -39.8 | +0.47 |
| 203 | 66.593 | 1997.8 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.3 | -39.7 | +0.61 |
| 204 | 66.614 | 1998.4 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.0 | -40.5 | +0.48 |
| 205 | 66.630 | 1998.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.8 | -39.2 | +0.54 |
| 206 | 66.697 | 2000.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.4 | -39.8 | +0.50 |
| 207 | 66.706 | 2001.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.3 | -38.9 | +0.63 |
| 208 | 66.730 | 2001.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.4 | -40.9 | +0.41 |
| 209 | 66.742 | 2002.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -26.0 | -41.3 | +0.63 |
| 210 | 66.786 | 2003.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.7 | -40.3 | +0.39 |
| 211 | 66.820 | 2004.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.7 | -40.0 | +0.41 |
| 212 | 66.856 | 2005.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.9 | -40.4 | +0.36 |
| 213 | 66.867 | 2006.0 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.3 | -38.6 | +0.56 |
| 214 | 66.891 | 2006.7 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.4 | -39.9 | +0.51 |
| 215 | 66.929 | 2007.9 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.2 | -40.5 | +0.58 |
| 216 | 66.953 | 2008.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -25.6 | -41.0 | +0.44 |
| 217 | 67.075 | 2012.2 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.6 | -40.0 | +0.41 |
| 218 | 67.171 | 2015.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.7 | -39.2 | +0.41 |
| 219 | 67.383 | 2021.5 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.2 | -39.7 | +0.36 |
| 220 | 67.386 | 2021.6 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -24.6 | -39.9 | +0.60 |
| 221 | 67.404 | 2022.1 | stroll_step | Londoner footstep strolling across Westminster Bridge | -10 | -23.4 | -38.8 | +0.52 |
