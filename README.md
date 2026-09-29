# Friday — Phase 1 Frontend

The first web interface for the Friday AI agent platform.

## Phase 1 focus

- Premium, uncluttered AI chat interface
- Responsive desktop and mobile layouts
- Dark mode with bright-mode option
- Conversation and history surface
- Task-oriented suggestion cards
- File attachment surface
- Voice interaction surface reserved for the agent layer
- Static frontend ready for the future Friday backend/API

## Design direction

The interface follows the supplied Friday UI references: dark glass-like surfaces, restrained borders, soft violet illumination, a focused central conversation area, and a compact navigation rail.

## Deployment

The GitHub Pages workflow is stored at .github/workflows/static.yml and publishes the contents of main.

The frontend uses plain HTML, CSS, and JavaScript for the first deployment, with no build dependency. Backend, model providers, task queues, memory, GitHub tools, and other agent capabilities can be connected in later phases.
