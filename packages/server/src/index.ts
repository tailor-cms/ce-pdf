import type {
  BeforeDisplayHook,
  HookMap,
  OnUserInteractionHook,
  ServerModule,
} from '@tailor-cms/cek-common';
import type { Element } from '@tailor-cms/ce-pdf-manifest';
import manifest from '@tailor-cms/ce-pdf-manifest';

// Detect if hooks are running in CEK (used for mocking end-system runtime)
const IS_CEK = process.env.CEK_RUNTIME;
// Don't use in production, use only when IS_CEK=true
const USER_STATE: Record<string, any> = {};

const toPages = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((it): it is number => Number.isInteger(it) && it > 0)
    : [];

const mergePages = (...lists: unknown[]): number[] =>
  [...new Set(lists.flatMap(toPages))].sort((a, b) => a - b);

export const beforeDisplay: BeforeDisplayHook<Element> = (
  _element,
  context,
) => {
  return { ...context, ...USER_STATE };
};

export const onUserInteraction: OnUserInteractionHook<Element> = (
  _element,
  context,
  payload,
) => {
  const { currentPage, pageCount, viewedPages } = payload ?? {};
  if (IS_CEK) {
    context.currentPage = currentPage;
    context.pageCount = pageCount;
    context.viewedPages = mergePages(context.viewedPages, viewedPages);
  }
  return { updateDisplayState: true };
};

export const hookMap: HookMap<Element> = new Map(
  Object.entries({
    beforeDisplay,
    onUserInteraction,
  }),
);

const serverModule: ServerModule<Element> = {
  ...manifest,
  hookMap,
  beforeDisplay,
  onUserInteraction,
};

export default serverModule;
