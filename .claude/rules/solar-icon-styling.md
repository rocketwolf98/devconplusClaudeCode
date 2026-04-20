# Rule: Solar Icon Set Does Not Support Tailwind `text-*` Color Classes

## The Rule

**Do not use Tailwind `text-*` color classes to color `solar-icon-set` icons.** The solar icon components do not use `currentColor` internally, so `text-primary`, `text-slate-400`, `text-blue`, etc. have no effect on icon fill or stroke.

## Why This Exists

`solar-icon-set` icons render with hardcoded SVG fill/stroke values and do not inherit the CSS `color` property via `currentColor`. Applying `text-*` classes silently does nothing — the icon renders in its default color, causing invisible styling bugs that are hard to catch during review.

## How to Apply

Use the `color` prop (or `style`) directly on the icon component, or wrap it and apply `fill-*` if the icon exposes a path that responds to fill:

```tsx
// ❌ Silently broken — text-* has no effect on solar icons
<HomeOutline className="text-primary w-5 h-5" />
<StarOutline className="text-gold w-5 h-5" />

// ✅ Correct — pass color via the `color` prop
<HomeOutline color="rgb(var(--color-primary))" width={20} height={20} />
<StarOutline color="#F8C630" width={20} height={20} />

// ✅ Also correct — inline style for theme-driven values
<HomeOutline style={{ color: 'rgb(var(--color-primary))' }} width={20} height={20} />
```

For inactive nav icons use the hex value directly:
```tsx
<HomeOutline color="#94A3B8" width={20} height={20} />  // slate-400
```

> The one exception is `fill-gold` on `<StarOutline />` — if you observe that specific combination working in existing code, it means that icon exposes a fill-reactive path. Do not generalize this to other icons; verify per icon.
