import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { codeToHast } from 'shiki';
import { unified } from 'unified';
import { parse } from 'yaml';

type Node = {
  type: string;
  name?: string;
  label?: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  children?: Node[];
  data?: Record<string, unknown>;
};

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  value?: string;
  children?: HastNode[];
};

type DocumentRecord = {
  slug: string;
  title: string;
  description?: string;
  html: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const contentDirectory = resolve(projectDirectory, 'content');
const outputFile = resolve(projectDirectory, 'src/app/generated/docs.generated.ts');
const shikiCssOutputFile = resolve(projectDirectory, 'src/app/generated/shiki.generated.css');
const alertKinds = new Set(['note', 'tip', 'warning', 'danger']);
const shikiColors = new Set<string>();
const openMwCodeTheme = {
  name: 'openmw-docs',
  settings: [
    { settings: { foreground: '#c8c7c1', background: '#111211' } },
    { scope: ['keyword', 'storage', 'keyword.control'], settings: { foreground: '#78a6c8' } },
    { scope: ['string'], settings: { foreground: '#a9b77a' } },
    { scope: ['entity.name.function', 'support.function', 'variable.function'], settings: { foreground: '#d5b16c' } },
    { scope: ['comment'], settings: { foreground: '#697169' } },
    { scope: ['constant.numeric', 'constant.language', 'support.constant'], settings: { foreground: '#c99871' } },
  ],
} as const;

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = await Promise.all(entries.map(async (entry) => {
    const location = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(location);
    return entry.isFile() && entry.name.endsWith('.md') ? [location] : [];
  }));
  return files.flat();
}

function text(node: Node): string {
  return node.value ?? node.children?.map(text).join('') ?? '';
}

function properties(node: Node, values: Record<string, unknown>): void {
  node.data = { ...node.data, hProperties: { ...(node.data?.['hProperties'] as Record<string, unknown> | undefined), ...values } };
}

function transformDirectives(fileName: string) {
  return (tree: Node) => {
    const visit = (node: Node | undefined): void => {
      if (!node) return;
      if (node.children) node.children.forEach(visit);
      if (node.type === 'code') {
        const title = node.meta?.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|(\S+))/)?.slice(1).find(Boolean);
        if (title) properties(node, { dataDocTitle: title });
      }
      if (node.type !== 'containerDirective') return;

      if (alertKinds.has(node.name ?? '')) {
        properties(node, { className: ['doc-alert', `doc-alert--${node.name}`], dataDocAlert: node.name });
        node.data = { ...node.data, hName: 'aside' };
        if (node.label) {
          node.children ??= [];
          node.children.unshift({
            type: 'paragraph',
            data: { hName: 'p', hProperties: { className: ['doc-alert__title'] } },
            children: [{ type: 'text', value: node.label }],
          });
        }
        return;
      }

      if (node.name !== 'tabs') {
        throw new Error(`${fileName}: unsupported :::${node.name ?? ''} directive`);
      }

      const source = node.children ?? [];
      const tabs: Array<{ label: string; code: Node }> = [];
      for (let index = 0; index < source.length; index += 2) {
        const marker = source[index];
        const code = source[index + 1];
        const match = marker?.type === 'paragraph' ? text(marker).match(/^@tab\s+(.+)$/) : null;
        if (!match || code?.type !== 'code') {
          throw new Error(`${fileName}: :::tabs must contain alternating @tab labels and fenced code blocks`);
        }
        tabs.push({ label: match[1].trim(), code });
      }
      if (tabs.length < 2) {
        throw new Error(`${fileName}: :::tabs needs at least two tabs`);
      }

      node.data = { ...node.data, hName: 'section' };
      properties(node, { className: ['doc-code-tabs'], dataDocTabs: '' });
      node.children = tabs.map(({ label, code }) => {
        properties(code, { dataDocTab: label });
        return code;
      });
    };
    visit(tree);
  };
}

function nodeText(node: HastNode): string {
  return node.value ?? node.children?.map(nodeText).join('') ?? '';
}

function findElement(node: HastNode, tagName: string): HastNode | undefined {
  return node.children?.find((child) => child.type === 'element' && child.tagName === tagName);
}

function moveShikiStylesToClasses(node: HastNode): void {
  const style = node.properties?.['style'];
  if (typeof style === 'string') {
    const color = style.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8})/i)?.[1]?.toLowerCase();
    if (color) {
      const className = `shiki-token-${color.slice(1)}`;
      shikiColors.add(color);
      const existing = node.properties?.['className'];
      node.properties = { ...node.properties, className: [...(Array.isArray(existing) ? existing : []), className] };
    }
    node.properties = { ...node.properties, style: undefined };
  }
  node.children?.forEach(moveShikiStylesToClasses);
}

function addLineNumbers(pre: HastNode): void {
  const code = findElement(pre, 'code');
  if (!code?.children) return;
  const lines = code.children.filter((child) => child.type === 'element' && child.tagName === 'span');
  if (lines.length > 1 && nodeText(lines.at(-1)!).trim() === '') lines.pop();
  code.children = lines.map((line) => ({
    type: 'element', tagName: 'span', properties: { className: ['doc-code-line'] }, children: [
      { type: 'element', tagName: 'span', properties: { className: ['doc-code-line__number'], ariaHidden: 'true' }, children: [] },
      { type: 'element', tagName: 'span', properties: { className: ['doc-code-line__content'] }, children: line.children ?? [] },
    ],
  }));
}

function highlightCode() {
  return async (tree: HastNode) => {
    const visit = async (node: HastNode): Promise<void> => {
      if (!node.children) return;
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (child.type === 'element' && child.tagName === 'pre') {
          const code = findElement(child, 'code');
          if (code) {
            const classNames = code.properties?.['className'];
            const languageClass = Array.isArray(classNames) ? classNames.find((name) => typeof name === 'string' && name.startsWith('language-')) : undefined;
            const language = typeof languageClass === 'string' ? languageClass.slice('language-'.length) : 'text';
            const highlighted = await codeToHast(nodeText(code), { lang: language || 'text', theme: openMwCodeTheme });
            const replacement = highlighted.children[0] as HastNode;
            moveShikiStylesToClasses(replacement);
            addLineNumbers(replacement);
            replacement.properties = { ...replacement.properties, className: ['doc-code-block'], dataDocTab: code.properties?.['dataDocTab'], dataDocTitle: code.properties?.['dataDocTitle'] ?? language };
            node.children[index] = replacement;
            continue;
          }
        }
        await visit(child);
      }
    };
    await visit(tree);
  };
}

function renderTabs() {
  return (tree: HastNode) => {
    let group = 0;
    const visit = (node: HastNode): void => {
      if (!node.children) return;
      for (const child of node.children) visit(child);
      if (node.type !== 'element' || childTag(node) !== 'section' || !('dataDocTabs' in (node.properties ?? {}))) return;
      node.properties = { className: ['doc-code-tabs'] };
      const tabs = node.children.filter((child) => child.type === 'element' && child.tagName === 'pre');
      const id = `doc-tabs-${group++}`;
      const buttons: HastNode[] = tabs.map((tab, index) => ({
        type: 'element', tagName: 'span', properties: {
          role: 'tab', id: `${id}-tab-${index}`, ariaControls: `${id}-panel-${index}`,
          ariaSelected: index === 0 ? 'true' : 'false', tabIndex: index === 0 ? 0 : -1, className: ['doc-code-tabs__tab'],
        }, children: [{ type: 'text', value: String(tab.properties?.['dataDocTab'] ?? `Example ${index + 1}`) }],
      }));
      const panels: HastNode[] = tabs.map((tab, index) => ({
        type: 'element', tagName: 'div', properties: {
          role: 'tabpanel', id: `${id}-panel-${index}`, ariaLabelledby: `${id}-tab-${index}`,
          className: ['doc-code-tabs__panel'], hidden: index === 0 ? undefined : true,
        }, children: [tab],
      }));
      node.children = [
        { type: 'element', tagName: 'div', properties: { className: ['doc-code-tabs__header'] }, children: [
          { type: 'element', tagName: 'div', properties: { role: 'tablist', ariaLabel: 'Code examples', className: ['doc-code-tabs__list'] }, children: buttons },
          { type: 'element', tagName: 'span', properties: { role: 'button', tabIndex: 0, className: ['doc-code-copy'] }, children: [{ type: 'text', value: 'Copy' }] },
        ] },
        ...panels,
      ];
    };
    visit(tree);
  };
}

function addCodeChrome() {
  return (tree: HastNode) => {
    const visit = (node: HastNode, inTabs = false): void => {
      if (!node.children) return;
      const isTabs = inTabs || (node.tagName === 'section' && Array.isArray(node.properties?.['className']) && node.properties?.['className'].includes('doc-code-tabs'));
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (child.type === 'element' && child.tagName === 'pre' && !isTabs) {
          node.children[index] = { type: 'element', tagName: 'section', properties: { className: ['doc-code-frame'] }, children: [
            { type: 'element', tagName: 'div', properties: { className: ['doc-code-frame__header'] }, children: [
              { type: 'element', tagName: 'span', properties: { className: ['doc-code-title'] }, children: [{ type: 'text', value: String(child.properties?.['dataDocTitle'] ?? 'Code') }] },
              { type: 'element', tagName: 'span', properties: { role: 'button', tabIndex: 0, className: ['doc-code-copy'] }, children: [{ type: 'text', value: 'Copy' }] },
            ] }, child,
          ] };
        } else visit(child, isTabs);
      }
    };
    visit(tree);
  };
}

function childTag(node: HastNode): string | undefined {
  return node.tagName;
}

async function compile(fileName: string): Promise<DocumentRecord> {
  const source = await readFile(fileName, 'utf8');
  let frontMatter: Record<string, unknown> = {};
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(() => (tree: Node) => {
      const yaml = tree.children?.find((node) => node.type === 'yaml')?.value;
      frontMatter = yaml ? (parse(yaml) as Record<string, unknown>) : {};
    })
    .use(remarkGfm)
    .use(remarkDirective)
    .use(() => transformDirectives(fileName))
    .use(remarkRehype)
    .use(highlightCode)
    .use(renderTabs)
    .use(addCodeChrome)
    .use(rehypeSlug)
    .use(rehypeSanitize, {
      ...defaultSchema,
      clobberPrefix: '',
      tagNames: [...(defaultSchema.tagNames ?? []), 'aside', 'button'],
      attributes: {
        ...defaultSchema.attributes,
        aside: [['className', 'doc-alert', 'doc-alert--note', 'doc-alert--tip', 'doc-alert--warning', 'doc-alert--danger'], 'dataDocAlert'],
        section: [['className', 'doc-code-tabs', 'doc-code-frame']],
        div: [...(defaultSchema.attributes?.div ?? []), ['className', 'doc-code-tabs__header', 'doc-code-tabs__list', 'doc-code-tabs__panel', 'doc-code-frame__header'], 'role', 'hidden', 'ariaLabel', 'ariaLabelledby'],
        p: [['className', 'doc-alert__title']],
        pre: [...(defaultSchema.attributes?.pre ?? []), ['className', 'doc-code-block']],
        span: [['className', /^shiki-token-[0-9a-f]+$/, 'doc-code-tabs__tab', 'doc-code-copy', 'doc-code-title', 'doc-code-line', 'doc-code-line__number', 'doc-code-line__content'], 'role', 'id', 'tabIndex', 'ariaControls', 'ariaSelected', 'ariaHidden'],
        '*': [...(defaultSchema.attributes?.['*'] ?? []), 'id'],
      },
    })
    .use(rehypeStringify);
  const html = String(await processor.process(source));
  const sourceRelative = relative(contentDirectory, fileName).split(sep).join('/').replace(/\.md$/, '');
  const slug = sourceRelative === 'index' ? '' : sourceRelative;
  const title = typeof frontMatter['title'] === 'string' ? frontMatter['title'] : sourceRelative.split('/').at(-1)?.replace(/[-_]/g, ' ') ?? 'Untitled';
  const description = typeof frontMatter['description'] === 'string' ? frontMatter['description'] : undefined;
  return { slug, title, description, html };
}

async function main(): Promise<void> {
  const files = await markdownFiles(contentDirectory);
  const documents = await Promise.all(files.map(compile));
  documents.sort((left, right) => left.slug.localeCompare(right.slug));
  const generated = `// Generated by scripts/build-content.ts. Do not edit directly.\n\nexport interface DocsDocument {\n  slug: string;\n  title: string;\n  description?: string;\n  html: string;\n}\n\nexport const docs: readonly DocsDocument[] = ${JSON.stringify(documents, null, 2)} as const;\n`;
  const shikiCss = `/* Generated by scripts/build-content.ts. Do not edit directly. */\n${[...shikiColors].sort().map((color) => `.shiki-token-${color.slice(1)} { color: ${color}; }`).join('\n')}\n`;
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, generated);
  await writeFile(shikiCssOutputFile, shikiCss);
  console.log(`Compiled ${documents.length} Markdown document${documents.length === 1 ? '' : 's'}.`);
}

void main();
