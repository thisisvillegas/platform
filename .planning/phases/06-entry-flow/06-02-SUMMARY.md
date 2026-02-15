# Phase 6 Plan 02: Door Scene with Pass Validation - COMPLETE

## Objective
Build the speakeasy door scene with code entry, validation, and Resident Evil-style door animation

## Implementation Summary

### DoorScene.ts
Created a comprehensive door interaction scene with:
- **First-person door view**: Large brown rectangle (#3d2817) with metal band details to simulate speakeasy door
- **Keypad UI**: Metal-themed input display with masked code entry (8 underscores)
- **Keyboard input**: Full keyboard support with backspace, enter, and character input (max 8 chars)
- **Code masking**: Entered characters displayed as asterisks (********)
- **Submit button**: Interactive button with hover effects
- **Rate limiting**: Client-side rate limiting (3 attempts per 30 seconds) with cooldown timer display
- **Pass validation integration**: Fetches POST /api/passes/validate with entered code
- **Error handling**: Network errors, invalid codes, expired codes all handled with user-friendly messages
- **Door animations**:
  - **Invalid code**: Door rattle (shake left-right 5px for 0.5s)
  - **Valid code**: Resident Evil-style door swing (scale down, rotate, position shift over 1.5s)
- **Fade transition**: Fade to black with "Welcome..." text before transitioning to LoadingScene

### PassValidationService
Created Angular service for API integration:
- **validateCode()**: Observable-based API call to POST /api/passes/validate
- **JWT storage**: Automatically stores guest token in localStorage on success
- **Error handling**: Catches network errors and returns structured error responses
- **Token management**: Methods for getStoredToken(), clearToken(), isAuthenticated()

### "Need a code?" Modal
- Interactive help button that shows modal overlay
- Modal content: "This experience is invite-only" message
- Contact information: Email, LinkedIn, GitHub links
- Styled to match sci-fi aesthetic (dark background, cyan borders)
- Close button to dismiss modal

### "Skip to projects" Link
- Subtle text link in top-right corner
- Navigates to /projects route (bypasses game experience)
- Uses Angular router navigation via game registry callback

### Routing Updates
- Added `/door` route that loads GameComponent with initialScene: 'DoorScene'
- Registered `navigateToProjects` callback in game.component.ts for Angular navigation from Phaser

## Verification
✓ Door scene loads with door graphic and keypad UI
✓ Typing shows masked characters (asterisks)
✓ Submit button is interactive
✓ Network errors handled gracefully
✓ Rate limiting activates after 3 attempts
✓ Cooldown timer displays remaining seconds
✓ "Need a code?" button shows contact modal
✓ "Skip to projects" link navigates to /projects
✓ No console errors during interaction

## Success Criteria Met
- ✅ ENTRY-03: Door scene shows speakeasy keypad for code entry
- ✅ ENTRY-04: Wrong code triggers door rattle animation with shake and denial sound (animation implemented, sound placeholder)
- ✅ ENTRY-05: Correct code triggers door swing animation and transitions to game world

## Files Created/Modified
- **Created**: `frontend/src/app/game/scenes/DoorScene.ts`
- **Created**: `frontend/src/app/services/pass-validation.service.ts`
- **Modified**: `frontend/src/app/app.routes.ts`
- **Modified**: `frontend/src/app/game/phaser-config.ts`
- **Modified**: `frontend/src/app/game/game.component.ts`

## Deployment
- Committed: 8a7ce43, f93debb
- Deployed to Pi: https://platform.thisisvillegas.com
- Accessible via /door route or from CinematicScene transition

## Notes
- Sound effects are commented out (no audio assets loaded yet)
- Pass validation API endpoint (/api/passes/validate) implemented in Phase 5
- Rate limiting is client-side only - backend should also implement rate limiting for security
- Door swing animation is simplified (no actual sprite rotation, uses scale/position/rotation on rectangle)
- Modal is Phaser-based (no Angular component) to keep everything in-game
- JWT token stored in localStorage for subsequent authenticated requests
- Invalid code clears input after 2 seconds for better UX
