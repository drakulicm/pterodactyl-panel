# TanStack Patterns

## loaderDeps Must Be Specific

Only include properties actually used in the loader. This ensures proper cache invalidation.

```typescript
// Bad: includes everything
loaderDeps: ({ search }) => search,
loader: async ({ deps }) => {
  await fetchData({ page: deps.page, pageSize: deps.pageSize })
}

// Good: only what's used
loaderDeps: ({ search }) => ({
  page: search.page,
  pageSize: search.pageSize,
}),
loader: async ({ deps }) => {
  await fetchData({ page: deps.page, pageSize: deps.pageSize })
}
```