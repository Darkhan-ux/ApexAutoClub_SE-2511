# Apex Auto Club

Final project of group **SE-2511**: a multi-page responsive website for a car community in Astana.

**Team:** Baizakov Darkhan · Kaldar Serzhan · Tagai Talgar

## Pages
| Page | Purpose |
|---|---|
| `index.html` | Home: hero, club numbers, what we do, site tools |
| `cars.html` | Member Cars: club members' cars with live search, category filter, sorting, likes |
| `explore.html` | Model Finder: external API (NHTSA vPIC) with loading / error states |
| `events.html` | Upcoming events, filter by type, "Join event" (RSVP) |
| `about.html` | Story, values, team, FAQ accordion |
| `contact.html` | Contact details and validated contact form |
| `signup.html` | Sign up (stored in localStorage) |
| `login.html` | Log in (checks localStorage, redirects to profile) |
| `profile.html` | Member details, saved cars, events, recent searches |

## Features
- Responsive layout with CSS Grid and Flexbox (desktop, tablet, mobile)
- Light and dark mode, saved in `localStorage` and kept on every page
- Authentication simulation with `localStorage`
- Custom JavaScript form validation (`novalidate`, no HTML validation attributes):
  email format, password length and complexity, mandatory fields, phone pattern (+7 / 8)
- Search and filters that update the page instantly; filters and searches are saved in `localStorage`
- External API: [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) via `fetch` + `async/await`
- Hover effects, scroll reveal, number counters, toasts

## Structure
```
apex-auto-club/
├── index.html, about.html, contact.html, cars.html, explore.html,
│   events.html, signup.html, login.html, profile.html
├── css/style.css
├── js/script.js
└── images/   (photos from Unsplash, see images/CREDITS.txt)
```

## Run locally
Open `index.html` in a browser, or serve the folder (for example with the VS Code Live Server extension).
