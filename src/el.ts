export function el<K extends keyof HTMLElementTagNameMap>(tag: K, options: {
    id?: string,
    className?: string,
    textContent?: string,
    placeholder?: string,
    dataset?: Record<string, string>,
    children?: HTMLElement[],
    listeners?: Record<string, EventListenerOrEventListenerObject>,
    style?: Partial<CSSStyleDeclaration>,
  } = {}): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent) element.textContent = options.textContent;
    if (options.placeholder) (element as HTMLInputElement).placeholder = options.placeholder;
    if (options.dataset) Object.entries(options.dataset).forEach(([k, v]) => element.dataset[k] = v);
    if (options.children) element.append(...options.children);
    if (options.listeners) Object.entries(options.listeners).forEach(([k, v]) => element.addEventListener(k, v));
    if (options.style) Object.assign(element.style, options.style);
    return element;
  }