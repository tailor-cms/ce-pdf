# @tailor-cms/ce-pdf-edit

Authoring component for the **PDF** content element in [Tailor CMS](https://github.com/tailor-cms/author).

Renders the element inside the Tailor authoring interface, where content is created and edited.

## Installation

```sh
npm install @tailor-cms/ce-pdf-edit
```

## Usage

Content elements are normally registered with Tailor through the element
registry rather than imported directly, but the package can be consumed on its
own:

```ts
import { Edit } from '@tailor-cms/ce-pdf-edit';
```

## Element

| Property | Value |
| --- | --- |
| Name | PDF |
| Type | `PDF` |
| Icon | [`mdi-file-pdf-box`](https://pictogrammers.com/library/mdi/) |
| Composite | No |

## Packages

This element ships as four packages, published together from the
[`ce-pdf`](https://github.com/tailor-cms/ce-pdf) repository:

| Package | Role |
| --- | --- |
| [`@tailor-cms/ce-pdf-manifest`](https://www.npmjs.com/package/@tailor-cms/ce-pdf-manifest) | Shared element definition |
| [`@tailor-cms/ce-pdf-edit`](https://www.npmjs.com/package/@tailor-cms/ce-pdf-edit) | Authoring component |
| [`@tailor-cms/ce-pdf-display`](https://www.npmjs.com/package/@tailor-cms/ce-pdf-display) | End-user component |
| [`@tailor-cms/ce-pdf-server`](https://www.npmjs.com/package/@tailor-cms/ce-pdf-server) | Server-side module |

## Development

```sh
pnpm install
pnpm dev     # start the Content Element Kit runtime
pnpm build   # build all packages
pnpm test    # Playwright end-to-end suite
```

Changes are released with [changesets](https://github.com/changesets/changesets);
run `pnpm changeset` to record one.
