declare module '*.mjs' {
  export const createEditorialRenderer: (
    context: CanvasRenderingContext2D,
    storyboard: unknown,
    image: HTMLImageElement,
  ) => (segment: unknown, time: number) => void;
}
