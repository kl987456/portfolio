/**
 * Enforces "one live WebGL context at a time" (THREEJS-ANIMATION-PLAN.md §7)
 * across every mounted scene, without any scene knowing the others exist.
 *
 * This portfolio is view-switched (only one of work/about/playground/project
 * renders at once) so most placements never overlap — but the nav menu and
 * the lightbox are dialogs layered on top of whichever view is current, so a
 * project hero's scene and the menu's constellation genuinely can be mounted
 * together. A LIFO stack fixes that: whichever scene mounts last pauses
 * everything beneath it, and gives the run back to the one below when it
 * unmounts, instead of every scene racing the GPU for frames no one can see.
 */
type Controller = { pause: () => void; resume: () => void };

const stack: Controller[] = [];

export function registerActiveScene(controller: Controller): () => void {
  stack[stack.length - 1]?.pause();
  stack.push(controller);
  return () => {
    const i = stack.indexOf(controller);
    if (i !== -1) stack.splice(i, 1);
    if (stack.length) stack[stack.length - 1].resume();
  };
}
