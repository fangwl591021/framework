import { createCompositionRoot } from "./runtime/composition-root";

const runtime = createCompositionRoot();

export default {
  fetch(request: Request): Promise<Response> {
    return runtime.app.fetch(request);
  },
} satisfies ExportedHandler;
