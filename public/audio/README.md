# Portfolio soundtrack

One track per view. Drop MP3s here using these exact names:

| File | Plays on |
|------|----------|
| `work.mp3`       | the home / work deck (`/`) |
| `systems.mp3`    | `/systems` (3D Lab) |
| `about.mp3`      | `/about` |
| `playground.mp3` | `/playground` |
| `hobbies.mp3`    | `/hobbies` |
| `project.mp3`    | any `/project/[slug]` page |
| `theme.mp3`      | fallback for any view above with no file of its own |

Only `theme.mp3` is required. Any view without its own file uses it, so a
single track works everywhere until you add more.

Behaviour, all handled in `lib/portfolio-audio.ts`:

- Nothing plays until the visitor turns on the header "Audio" switch.
- Tracks loop, fade in over ~1.4s, and crossfade when the view changes.
- Switching to a view whose track is already playing does not restart it.
- If no file is reachable at all, a generated chord bed plays instead, so
  the switch always does something.

Use only audio you own or that is licensed for web distribution.
